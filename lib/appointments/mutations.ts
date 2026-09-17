// Aiva — tenant-scoped appointment writes.
//
// DB-level double-booking prevention via `@@unique([doctorId, scheduledAt])`
// surfaces as Prisma P2002 — the API layer's mapPrismaError translates that
// to HTTP 409. Race-safe and atomic.

import "server-only";
import type { Appointment, AppointmentType, ClinicStaff } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { normalizePhone } from "@/lib/voice/phone";
import { toLocalDate, toLocalTime } from "@/lib/voice/tz";
import { findPatientTimeConflictsByIds } from "@/lib/appointments/queries";
import {
  dispatchAppointmentConfirmationSms,
  dispatchAppointmentRescheduleSms,
  dispatchAppointmentCancellationSms,
} from "@/lib/notifications/mutations";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/lib/validations/appointment";

// Thrown when the same patient would hold two appointments that OVERLAP in time
// under different doctors. The DB's @@unique([doctorId, scheduledAt]) guard only
// stops a single doctor being double-booked; a patient sitting in two chairs at
// once is an operational error the API must catch BEFORE writing. Carries
// formatted conflict lines (clinic-local dates) for the frontend warning panel.
export class PatientConflictError extends Error {
  constructor(
    public conflicts: {
      doctorName: string;
      date: string; // YYYY-MM-DD, clinic-local
      time: string; // HH:mm, clinic-local
      status: string;
    }[],
  ) {
    super(
      "This patient already has an appointment at the same time with another doctor.",
    );
    this.name = "PatientConflictError";
  }
}

// Confirmations are best-effort and must never block the write that triggered
// them — dispatchAppointmentConfirmationSms is contract-guaranteed not to throw.
async function maybeDispatchConfirmationSms(
  staff: Pick<ClinicStaff, "clinicId">,
  appointmentId: string,
  status: Appointment["status"],
): Promise<void> {
  if (status === "Confirmed") {
    await dispatchAppointmentConfirmationSms(staff, appointmentId);
  }
}

// Same best-effort contract as the confirmation helper: reschedule texts only
// fire when the appointment is Confirmed (a Pending appointment's final time
// rides its own confirmation SMS), and never block the reschedule write.
async function maybeDispatchRescheduleSms(
  staff: Pick<ClinicStaff, "clinicId">,
  appointmentId: string,
  status: Appointment["status"],
): Promise<void> {
  if (status === "Confirmed") {
    await dispatchAppointmentRescheduleSms(staff, appointmentId);
  }
}

export async function createAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  // Verify patient + doctor both belong to the calling clinic before insert.
  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: input.patientId, ...clinicWhere(staff) },
      select: { id: true },
    }),
    prisma.doctor.findFirst({
      where: { id: input.doctorId, ...clinicWhere(staff), deactivatedAt: null },
      select: { id: true },
    }),
  ]);
  if (!patient) {
    throw new AppointmentFkError("patientId", "Patient not found in this clinic.");
  }
  if (!doctor) {
    throw new AppointmentFkError(
      "doctorId",
      "Doctor not found or deactivated in this clinic.",
    );
  }

  const { confirm, ...data } = input;

  await assertNoPatientTimeConflict(staff, {
    patientIds: [input.patientId],
    doctorId: input.doctorId,
    from: new Date(input.scheduledAt),
    durationMin: data.durationMin ?? 30,
    confirmed: confirm ?? false,
  });

  const created = await prisma.appointment.create({
    data: {
      ...data,
      scheduledAt: new Date(data.scheduledAt),
      status: data.status ?? "Pending",
      clinicId: staff.clinicId,
    },
  });

  // A receptionist creating the appointment already-Confirmed means the patient
  // should get the confirmation text like any other confirmation.
  await maybeDispatchConfirmationSms(staff, created.id, created.status);

  return created;
}

export async function updateAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
  input: UpdateAppointmentInput,
): Promise<Appointment | null> {
  // Read the row FIRST (scoped) so we can detect a transition into Confirmed —
  // the trigger for the confirmation SMS — and so updateMany never silently
  // no-ops cross-tenant while we then dispatch on a row we shouldn't have.
  const current = await prisma.appointment.findFirst({
    where: { id, ...clinicWhere(staff) },
    select: { status: true },
  });
  if (!current) return null;

  const result = await prisma.appointment.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: input,
  });
  if (result.count === 0) return null;

  const updated = await prisma.appointment.findUniqueOrThrow({ where: { id } });

  // Pending/… → Confirmed is the single moment we text. Re-saving a confirmed
  // appointment (notes/duration edits) stays Confirmed → no second SMS; the
  // notification side repeats the guard anyway.
  const becameConfirmed =
    (input.status ?? current.status) === "Confirmed" &&
    current.status !== "Confirmed";
  if (becameConfirmed) {
    await maybeDispatchConfirmationSms(staff, updated.id, updated.status);
  }

  return updated;
}

export async function rescheduleAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
  input: RescheduleAppointmentInput,
): Promise<Appointment | null> {
  // updateMany would silently no-op cross-tenant; we need findFirst first so
  // the unique constraint check happens on the right tenant.
  const existing = await prisma.appointment.findFirst({
    where: { id, ...clinicWhere(staff) },
    select: { id: true, doctorId: true, patientId: true },
  });
  if (!existing) return null;

  const { confirm, ...data } = input;

  // Skip the patient-level conflict check when the appointment isn't moving in
  // time (idempotent re-ask) — it can't collide with anything new.
  await assertNoPatientTimeConflict(staff, {
    patientIds: [existing.patientId],
    doctorId: existing.doctorId,
    from: new Date(data.scheduledAt),
    durationMin: data.durationMin ?? 30,
    excludeAppointmentId: existing.id,
    confirmed: confirm ?? false,
  });

  const updated = await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      scheduledAt: new Date(data.scheduledAt),
      ...(data.durationMin ? { durationMin: data.durationMin } : {}),
    },
  });

  // Moving a confirmed appointment should tell the patient the new time.
  await maybeDispatchRescheduleSms(staff, updated.id, updated.status);

  return updated;
}

async function assertNoPatientTimeConflict(
  staff: Pick<ClinicStaff, "clinicId">,
  args: {
    patientIds: string[];
    doctorId: string;
    from: Date;
    durationMin: number;
    excludeAppointmentId?: string;
    confirmed?: boolean; // set after the user has seen the warning and opted to proceed
  },
): Promise<void> {
  if (args.confirmed) return; // explicit user approval — book anyway.
  const conflicts = await findPatientTimeConflictsByIds(staff, {
    patientIds: args.patientIds,
    from: args.from,
    to: new Date(args.from.getTime() + args.durationMin * 60_000),
    doctorId: args.doctorId,
    excludeAppointmentId: args.excludeAppointmentId,
  });
  if (conflicts.length === 0) return;

  // Format each conflicting appointment's time in the clinic's local timezone
  // so the frontend can render a human-friendly warning panel.
  const clinic = await prisma.clinic.findUnique({
    where: { id: staff.clinicId },
    select: { timezone: true },
  });
  const tz = clinic?.timezone ?? "UTC";
  throw new PatientConflictError(
    conflicts.map((c) => ({
      doctorName: c.doctorName,
      date: toLocalDate(c.scheduledAt, tz),
      time: toLocalTime(c.scheduledAt, tz),
      status: c.status,
    })),
  );
}

export async function cancelAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
): Promise<boolean> {
  const result = await prisma.appointment.updateMany({
    where: { id, ...clinicWhere(staff), status: { not: "Cancelled" } },
    data: { status: "Cancelled" },
  });
  if (result.count === 0) return false;
  // Best-effort cancellation SMS — never throws, never blocks the cancel. The
  // dispatch itself decides whether the patient was told about the booking
  // (requireConfirmedFirst) so we never text about a cancellation they didn't
  // know existed.
  await dispatchAppointmentCancellationSms(staff, id);
  return true;
}

// Thrown by createAppointment when the patientId/doctorId belong to another
// clinic. The api-engineer layer turns this into a 422 with field hint.
export class AppointmentFkError extends Error {
  constructor(
    public field: "patientId" | "doctorId",
    message: string,
  ) {
    super(message);
    this.name = "AppointmentFkError";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Voice booking (Phase 4)
//
// The voice agent books on behalf of a phone caller. The endpoint has already
// resolved + validated the doctor and the slot instant; this helper does the
// write: find-or-create the patient by phone, then create the appointment.
//
// All queries are SEQUENTIAL — the voice DB pool runs connection_limit=1
// (pgbouncer); concurrent Prisma queries contend on the single connection and
// intermittently fail. Do NOT Promise.all here.
//
// Idempotency / double-book safety leans entirely on the DB constraint
// @@unique([doctorId, scheduledAt]): a duplicate write throws P2002. We catch it
// and look up the existing appointment — if it belongs to THIS caller we treat
// the booking as already done (idempotent success); otherwise the slot was taken
// by someone else (SlotTakenError).
// ────────────────────────────────────────────────────────────────────────────

export interface VoiceBookInput {
  doctorId: string;
  scheduledAt: Date; // true instant
  durationMin: number;
  type: AppointmentType;
  phone: string;
  patientName?: string; // used only when creating a new patient
}

export interface VoiceBookResult {
  appointment: Appointment & {
    patient: { id: string; fullName: string };
    doctor: { id: string; name: string };
  };
  idempotent: boolean; // true if this slot was already booked by this caller
}

export class SlotTakenError extends Error {
  constructor(message = "That time was just taken.") {
    super(message);
    this.name = "SlotTakenError";
  }
}

export async function bookAppointmentForVoice(
  staff: Pick<ClinicStaff, "clinicId">,
  input: VoiceBookInput,
): Promise<VoiceBookResult> {
  // Canonicalize the phone so the same caller maps to one patient record
  // regardless of how the number was spoken/typed (see lib/voice/phone.ts).
  const phone = normalizePhone(input.phone);

  // 1. Find an existing patient in this clinic by phone (most-recent first so a
  // repeat caller reuses their record). Create one only if none exists.
  let patient = await prisma.patient.findFirst({
    where: { clinicId: staff.clinicId, phoneNumber: phone },
    orderBy: { createdAt: "desc" },
    select: { id: true, fullName: true },
  });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        clinicId: staff.clinicId,
        fullName: input.patientName?.trim() || "Phone caller",
        phoneNumber: phone,
      },
      select: { id: true, fullName: true },
    });
  }

  // 2. Create the appointment. The unique (doctorId, scheduledAt) guard makes
  // this race-safe; a duplicate throws P2002, handled below.
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: input.doctorId,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        type: input.type,
        status: "Confirmed",
        clinicId: staff.clinicId,
      },
      include: {
        patient: { select: { id: true, fullName: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    // Fresh booking → the patient is confirmed as of right now; send the
    // confirmation text. best-effort, never throws. (The idempotent re-book
    // branch below skips this — that caller already got the SMS once.)
    await maybeDispatchConfirmationSms(staff, appointment.id, appointment.status);
    return { appointment, idempotent: false };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Slot already booked. Look up who holds it. (clinicWhere here is the safe
      // direction: the @@unique constraint is (doctorId, scheduledAt) WITHOUT
      // clinicId — fine because a doctor belongs to one clinic — but we still
      // scope the lookup, so a hypothetical cross-clinic row reads as null and
      // we fail closed via SlotTakenError. Don't "fix" the scoping away.)
      const existing = await prisma.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          scheduledAt: input.scheduledAt,
          ...clinicWhere(staff),
        },
        include: {
          patient: { select: { id: true, fullName: true, phoneNumber: true } },
          doctor: { select: { id: true, name: true } },
        },
      });
      // Same caller (a retry / re-ask) → idempotent success. Compare by PHONE,
      // not patient id: phoneNumber is non-unique, so a same-phone duplicate
      // patient row would otherwise make a caller's own re-book look "taken".
      if (existing && existing.patient.phoneNumber === phone) {
        return { appointment: existing, idempotent: true };
      }
      throw new SlotTakenError();
    }
    throw e;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Voice cancel + reschedule (Phase 6)
//
// The voice layer has no appointment ids, so both helpers identify the target
// the way a caller describes it: their phone + the doctor + the clinic-local
// instant the agent read back from a prior lookup. We match on phone via the
// patient relation (NOT a separately-fetched patient id), and only ever touch
// non-Cancelled rows, scoped to the calling clinic. SEQUENTIAL only.
// ────────────────────────────────────────────────────────────────────────────

const VOICE_APPT_INCLUDE = {
  patient: { select: { id: true, fullName: true, phoneNumber: true } },
  doctor: { select: { id: true, name: true } },
} as const;

type VoiceAppt = Appointment & {
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string };
};

export interface VoiceCancelInput {
  phone: string;
  doctorId: string;
  scheduledAt: Date; // true instant of the appointment to cancel
}

export type VoiceCancelResult =
  | { cancelled: true; appointment: VoiceAppt }
  | { cancelled: false; reason: "not_found" };

export async function cancelAppointmentForVoice(
  staff: Pick<ClinicStaff, "clinicId">,
  input: VoiceCancelInput,
): Promise<VoiceCancelResult> {
  const phone = normalizePhone(input.phone);
  // Find the caller's live appointment at that doctor+instant.
  const existing = await prisma.appointment.findFirst({
    where: {
      ...clinicWhere(staff),
      doctorId: input.doctorId,
      scheduledAt: input.scheduledAt,
      status: { not: "Cancelled" },
      patient: { phoneNumber: phone },
    },
    include: VOICE_APPT_INCLUDE,
  });
  if (!existing) return { cancelled: false, reason: "not_found" };
  await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: "Cancelled" },
  });
  // Best-effort cancellation SMS (only if the caller was confirmed earlier).
  await dispatchAppointmentCancellationSms(staff, existing.id);
  return { cancelled: true, appointment: existing };
}

export interface VoiceRescheduleInput {
  phone: string;
  doctorId: string;
  fromScheduledAt: Date; // current instant (identifies the appointment)
  toScheduledAt: Date; // new instant (validated on the grid by the endpoint)
  durationMin: number;
}

export type VoiceRescheduleResult =
  | { rescheduled: true; appointment: VoiceAppt }
  | { rescheduled: false; reason: "not_found" | "slot_taken" };

export async function rescheduleAppointmentForVoice(
  staff: Pick<ClinicStaff, "clinicId">,
  input: VoiceRescheduleInput,
): Promise<VoiceRescheduleResult> {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.appointment.findFirst({
    where: {
      ...clinicWhere(staff),
      doctorId: input.doctorId,
      scheduledAt: input.fromScheduledAt,
      status: { not: "Cancelled" },
      patient: { phoneNumber: phone },
    },
    include: VOICE_APPT_INCLUDE,
  });
  if (!existing) return { rescheduled: false, reason: "not_found" };
  // Moving to the same instant is a no-op success (idempotent re-ask).
  if (existing.scheduledAt.getTime() === input.toScheduledAt.getTime()) {
    return { rescheduled: true, appointment: existing };
  }
  // The @@unique([doctorId, scheduledAt]) guard makes the move race-safe; a
  // collision with another appointment surfaces as P2002 → slot_taken.
  try {
    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: { scheduledAt: input.toScheduledAt, durationMin: input.durationMin },
      include: VOICE_APPT_INCLUDE,
    });
    // The caller just moved a (confirmed) appointment on the phone — text them
    // the new time. Best-effort, never throws.
    await maybeDispatchRescheduleSms(staff, updated.id, updated.status);
    return { rescheduled: true, appointment: updated };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { rescheduled: false, reason: "slot_taken" };
    }
    throw e;
  }
}
