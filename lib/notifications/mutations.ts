// Aiva — tenant-scoped notification writes (SMS dispatch).
//
// The Notification model is the audit/log of every message we've sent or tried
// to send (type/channel/status/message/sentAt/errorMsg). This file owns the
// WRITE side: building patient SMSs for appointment lifecycle events and
// recording the outcome.
//
// Three dispatch entry points, one shared pipeline:
//   • dispatchAppointmentConfirmationSms — status becomes Confirmed
//   • dispatchAppointmentRescheduleSms   — an appointment's time is moved
//   • dispatchAppointmentCancellationSms — an appointment is cancelled
// Everything routes to sendSms() → getSmsProvider() (see lib/sms), so the
// confirmation/reschedule/cancellation experience is identical whether the
// change came from the dashboard or the voice agent.
//
// Non-blocking by contract: dispatches NEVER throw. A TextBee outage, a missing
// env key or a failed DB write must not undo the appointment write that
// triggered them — the write is already committed before dispatch is called.
// Failure is captured on the Notification row (status=Failed, errorMsg).
//
// Idempotency:
//   • Confirmation — re-saving a confirmed appointment must NOT re-text. Skip
//     if a SENT confirmation already exists for the appointment.
//   • Reschedule   — every NEW move deserves a text, but re-running the SAME
//     move (idempotent re-ask, double-submit) must not. The message embeds the
//     new date+time, so we skip when a SENT "Reschedule" with the IDENTICAL
//     text exists — a genuinely different move always differs.
//   • Cancellation — only chase cancellations the patient was actually told
//     about (a SENT Confirmation exists). Skip if a SENT Cancellation exists.
//   A Failed row is retried on the next dispatch for that event (legit repair).

import "server-only";
import type {
  Appointment,
  AppointmentStatus,
  ClinicStaff,
  NotificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { getAiSettings } from "@/lib/ai-settings/queries";
import { toLocalTime } from "@/lib/voice/tz";
import { toE164 } from "@/lib/voice/phone";
import { getSmsProvider } from "@/lib/sms/provider";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

// Why we didn't send (sent:false). Only surfaces internally / for debugging;
// the API layer keeps treating the appointment event as done regardless.
export type SmsSkipReason =
  | "not_found" // appointment isn't in the expected state (or belongs to another clinic)
  | "no_phone" // patient has no usable phone number on file
  | "disabled" // AiSettings.sendConfirmations = false
  | "duplicate" // the same SMS was already sent for this event
  | "not_confirmed"; // cancellation only: the patient was never sent a confirmation

export interface SmsDispatchResult {
  sent: boolean;
  reason?: SmsSkipReason;
  notificationId?: string;
}

type SmsEvent = "Confirmation" | "Reschedule" | "Cancellation";

// Appointment shape a dispatch needs, fetched tenant-scoped.
type AppointmentForSms = Appointment & {
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string };
  clinic: { id: string; name: string; timezone: string };
};

// Duplicate check receives the most recent SMS row for the same (appointment,
// event) plus the message this dispatch WOULD send; return true when the send
// should be skipped as a repeat.
type DuplicateCheck = (
  prior: { status: NotificationStatus; message: string } | null,
  message: string,
) => boolean;

// ────────────────────────────────────────────────────────────────────────────
// Public entry points
// ────────────────────────────────────────────────────────────────────────────

export function dispatchAppointmentConfirmationSms(
  staff: ScopedStaff,
  appointmentId: string,
): Promise<SmsDispatchResult> {
  return dispatchEvent(staff, appointmentId, {
    event: "Confirmation",
    // A confirmation tells the patient a time they were never told before —
    // one per appointment, period.
    requireStatus: "Confirmed",
    isDuplicate: (prior) => prior?.status === "Sent",
    buildMessage: confirmationMessage,
  });
}

export function dispatchAppointmentRescheduleSms(
  staff: ScopedStaff,
  appointmentId: string,
): Promise<SmsDispatchResult> {
  return dispatchEvent(staff, appointmentId, {
    event: "Reschedule",
    // Only confirmed commitments get a "we moved it" text; a Pending
    // appointment's final time will ride its own confirmation SMS.
    requireStatus: "Confirmed",
    // Same message text = same move already notified. Different move = new text.
    isDuplicate: (prior, message) =>
      prior?.status === "Sent" && prior.message === message,
    buildMessage: rescheduleMessage,
  });
}

export function dispatchAppointmentCancellationSms(
  staff: ScopedStaff,
  appointmentId: string,
): Promise<SmsDispatchResult> {
  return dispatchEvent(staff, appointmentId, {
    event: "Cancellation",
    requireStatus: undefined, // the row is already Cancelled when we run
    // One cancellation per appointment; a cancelled row can't be re-cancelled.
    isDuplicate: (prior) => prior?.status === "Sent",
    buildMessage: cancellationMessage,
    requireConfirmedFirst: true,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Shared pipeline
// ────────────────────────────────────────────────────────────────────────────

async function dispatchEvent(
  staff: ScopedStaff,
  appointmentId: string,
  opts: {
    event: SmsEvent;
    requireStatus?: AppointmentStatus;
    isDuplicate: DuplicateCheck;
    buildMessage: (a: AppointmentForSms) => string;
    /** Cancellation only: skip unless a SENT Confirmation SMS exists. */
    requireConfirmedFirst?: boolean;
  },
): Promise<SmsDispatchResult> {
  let appointment: AppointmentForSms | null = null;
  try {
    // 0. Master switch. Default AiSettings.sendConfirmations is true (set at
    //    signup), so patient SMS is "on" unless an admin turned it off in
    //    Settings → AI. Gates confirmations AND reschedules AND cancellations —
    //    one consistent off-switch for automated patient texts.
    const settings = await getAiSettings(staff);
    if (settings && settings.sendConfirmations === false) {
      return { sent: false, reason: "disabled" };
    }

    // 1. Load the appointment + everything needed to write the text. Scoped the
    //    same way appointments/queries.ts does. Wrong status (or another
    //    clinic) → nothing to send.
    appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        ...(opts.requireStatus ? { status: opts.requireStatus } : {}),
        ...clinicWhere(staff),
      },
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
        doctor: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true, timezone: true } },
      },
    });
    if (!appointment) return { sent: false, reason: "not_found" };

    const e164 = smsE164(appointment.patient.phoneNumber);
    if (!e164) return { sent: false, reason: "no_phone" };

    // 2. Cancellation guard: only chase cancels the patient was told about.
    if (opts.requireConfirmedFirst) {
      const wasConfirmed = await prisma.notification.findFirst({
        where: {
          appointmentId: appointment.id,
          type: "Confirmation",
          channel: "SMS",
          status: "Sent",
          patient: { clinicId: staff.clinicId },
        },
        select: { id: true },
      });
      if (!wasConfirmed) return { sent: false, reason: "not_confirmed" };
    }

    // 3. Build the text once, then duplicate-guard per event (see header rules).
    const message = opts.buildMessage(appointment);
    const prior = await prisma.notification.findFirst({
      where: {
        appointmentId: appointment.id,
        type: opts.event,
        channel: "SMS",
        patient: { clinicId: staff.clinicId },
      },
      orderBy: { createdAt: "desc" },
      select: { status: true, message: true },
    });
    if (opts.isDuplicate(prior, message)) return { sent: false, reason: "duplicate" };

    // 4. Write the intent first (Pending), then send, then mark the outcome.
    //    Sequential queries — the Supabase pooler is connection_limit=1.
    const notification = await prisma.notification.create({
      data: {
        type: opts.event,
        channel: "SMS",
        status: "Pending",
        message,
        patientId: appointment.patient.id,
        appointmentId: appointment.id,
      },
    });

    const result = await getSmsProvider().send({ to: e164, message });

    if (!result.success) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "Failed", errorMsg: result.error },
      });
      return { sent: false, notificationId: notification.id };
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "Sent",
        sentAt: new Date(),
        ...(result.providerRef ? { providerRef: result.providerRef } : {}),
      },
    });
    return { sent: true, notificationId: notification.id };
  } catch (e) {
    // Last-resort guard: never let SMS bookkeeping break the appointment flow.
    // Failure is logged to the server console; staff visibility into the
    // dropped send is a follow-up job (the row may never have been created).
    console.error(`[sms] ${opts.event} dispatch failed`, e);
    return { sent: false };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Message builders
// ────────────────────────────────────────────────────────────────────────────

// Clinic-local date/time, so the patient sees noon/morning in the clinic's own
// timezone, not the dashboard viewer's.
function messageDate(a: AppointmentForSms): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: a.clinic.timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(a.scheduledAt);
}

function confirmationMessage(a: AppointmentForSms): string {
  return `${a.clinic.name}: Your appointment with Dr. ${a.doctor.name} is CONFIRMED for ${messageDate(a)} at ${toLocalTime(a.scheduledAt, a.clinic.timezone)}.`;
}

function rescheduleMessage(a: AppointmentForSms): string {
  return `${a.clinic.name}: Your appointment with Dr. ${a.doctor.name} has been RESCHEDULED to ${messageDate(a)} at ${toLocalTime(a.scheduledAt, a.clinic.timezone)}.`;
}

function cancellationMessage(a: AppointmentForSms): string {
  return `${a.clinic.name}: Your appointment with Dr. ${a.doctor.name} on ${messageDate(a)} at ${toLocalTime(a.scheduledAt, a.clinic.timezone)} has been CANCELLED.`;
}

// Convert the stored phone to TextBee's required E.164 form ("+92…"). The
// clinic's region can be overridden with SMS_DEFAULT_COUNTRY_CODE. Returns null
// when the patient has no usable number worth texting.
function smsE164(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  return toE164(raw, process.env.SMS_DEFAULT_COUNTRY_CODE?.trim() || "92");
}