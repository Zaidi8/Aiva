// Aiva — tenant-scoped notification writes (SMS dispatch).
//
// The Notification model is the audit/log of every message we've sent or
// tried to send (type/channel/status/message/sentAt/errorMsg). This file owns
// the WRITE side: building a confirmation SMS for a confirmed appointment and
// recording the outcome.
//
// Non-blocking by contract: `dispatchAppointmentConfirmationSms` NEVER throws.
// A TextBee outage, a missing env key or a failed DB write must not undo the
// appointment confirmation that triggered the dispatch — the appointment write
// is already committed before this is called. Failure is captured on the
// Notification row (status=Failed, errorMsg) for staff to see in the bell.
//
// Rate/idempotency: re-saving an already-confirmed appointment (edit notes,
// bump duration) must NOT re-text the patient. We guard on the prior existence
// of a SENT confirmation SMS for the appointment; a Failed row is retried the
// next time confirmation logic runs (that's a legit repair path, not a dup).

import "server-only";
import type { Appointment, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { getAiSettings } from "@/lib/ai-settings/queries";
import { toLocalTime } from "@/lib/voice/tz";
import { toE164 } from "@/lib/voice/phone";
import { getSmsProvider } from "@/lib/sms/provider";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

// Why we didn't send (sent:false). Only surfaces internally / for debugging;
// the API layer keeps treating the appointment as confirmed regardless.
export type SmsSkipReason =
  | "not_found" // appointment isn't Confirmed (or doesn't belong to this clinic)
  | "no_phone" // patient has no usable phone number on file
  | "disabled" // AiSettings.sendConfirmations = false
  | "duplicate"; // a confirmation SMS was already sent for this appointment

export interface SmsDispatchResult {
  sent: boolean;
  reason?: SmsSkipReason;
  notificationId?: string;
}

// Appointment shape this dispatch needs, fetched tenant-scoped.
type AppointmentForSms = Appointment & {
  patient: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  doctor: { id: string; name: string };
  clinic: { id: string; name: string; timezone: string };
};

export async function dispatchAppointmentConfirmationSms(
  staff: ScopedStaff,
  appointmentId: string,
): Promise<SmsDispatchResult> {
  try {
    // 0. Respect the clinic's toggle. Default AiSettings.sendConfirmations is
    //    true (registered at signup), so this is "on" unless an admin switched
    //    it off in Settings → AI.
    const settings = await getAiSettings(staff);
    if (settings && settings.sendConfirmations === false) {
      return { sent: false, reason: "disabled" };
    }

    // 1. Load the confirmed appointment + everything needed to write the text.
    //    Scoped the same way appointments/queries.ts does. If it's not
    //    Confirmed (or belongs to another clinic), there's nothing to send.
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, ...clinicWhere(staff), status: "Confirmed" },
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
        doctor: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true, timezone: true } },
      },
    });
    if (!appointment) return { sent: false, reason: "not_found" };

    const e164 = smsE164(appointment.patient.phoneNumber);
    if (!e164) return { sent: false, reason: "no_phone" };

    // 2. Duplicate guard. A second SENT confirmation for the same appointment
    //    means the patient was already texted — editing/re-saving the
    //    appointment must not send again. (Failed rows are retried.)
    const prior = await prisma.notification.findFirst({
      where: {
        appointmentId: appointment.id,
        type: "Confirmation",
        channel: "SMS",
        patient: { clinicId: staff.clinicId },
      },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (prior?.status === "Sent") {
      return { sent: false, reason: "duplicate" };
    }

    const message = buildConfirmationSms(appointment);

    // 3. Write the intent first (Pending), then send, then mark the outcome.
    //    Sequential queries — the Supabase pooler is connection_limit=1.
    const notification = await prisma.notification.create({
      data: {
        type: "Confirmation",
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
    // The failure is logged to the server console; staff visibility into the
    // dropped send is a follow-up job (the row may never have been created).
    console.error("[sms] confirmation dispatch failed", e);
    return { sent: false };
  }
}

// Convert the stored phone to TextBee's required E.164 form ("+92…"). The
// clinic's region can be overridden with SMS_DEFAULT_COUNTRY_CODE. Returns null
// when the patient has no usable number worth texting.
function smsE164(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  return toE164(raw, process.env.SMS_DEFAULT_COUNTRY_CODE?.trim() || "92");
}

// "Delightful Clinic: Your appointment with Dr. Ahmed Khan is CONFIRMED for
// 16 Sep 2026 at 14:30." — clinic-local date/time, so the patient sees the
// time in the clinic's own timezone, not the dashboard viewer's.
function buildConfirmationSms(appointment: AppointmentForSms): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: appointment.clinic.timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(appointment.scheduledAt);
  const time = toLocalTime(appointment.scheduledAt, appointment.clinic.timezone);
  return `${appointment.clinic.name}: Your appointment with ${appointment.doctor.name} is CONFIRMED for ${date} at ${time}.`;
}