// Aiva — Phase 4 voice tool: book an appointment (WRITE).
//
// Called by the Python agent's `book_appointment` tool AFTER it has read the
// booking back to the caller and gotten a spoken yes. Resolves the spoken doctor
// name, converts the clinic-local date+time to a true instant, verifies the slot
// is genuinely open, then writes the appointment (creating the patient if the
// caller's phone is new). Double-book/idempotency is handled in the mutation via
// the @@unique([doctorId, scheduledAt]) constraint.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/prisma";
import { listActiveDoctors } from "@/lib/doctors/queries";
import { matchDoctor } from "@/lib/voice/doctor-match";
import {
  computeAvailability,
  conflictsAcknowledged,
  findPatientTimeConflicts,
} from "@/lib/appointments/queries";
import {
  bookAppointmentForVoice,
  SlotTakenError,
} from "@/lib/appointments/mutations";
import {
  localWallClockToInstant,
  localDayBoundsUTC,
  toLocalTime,
  toLocalDate,
} from "@/lib/voice/tz";
import { voiceBookBodySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

export const POST = withWebhookSecret(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = voiceBookBodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const {
    clinicId,
    doctorName,
    date,
    time,
    phone,
    patientName,
    confirm,
    conflictAckIds,
  } = parsed.data;
  const staff = { clinicId };

  try {
    // findUnique by Clinic PK is safe: Clinic is the tenant root, not a
    // clinic-owned child, so there is no cross-tenant scope to apply.
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    if (!clinic) {
      return fail("CLINIC_NOT_FOUND", `No clinic with id ${clinicId}.`, 404);
    }

    // Resolve the spoken doctor name (sequential — connection_limit=1).
    const doctors = await listActiveDoctors(staff);
    const match = matchDoctor(doctors, doctorName);
    if (match.matched === "none") {
      return ok({ booked: false, reason: "not_found", doctorName });
    }
    if (match.matched === "many") {
      return ok({
        booked: false,
        reason: "ambiguous",
        candidates: (match.candidates ?? []).map((d) => d.name),
      });
    }
    const doctor = match.doctor!;

    // Convert the clinic-local wall-clock to a true instant, then verify it is a
    // real SCHEDULABLE slot for this doctor (includeTaken: validate against the
    // schedule grid, NOT free slots). We deliberately do NOT reject already-booked
    // slots here — the mutation's DB unique guard decides idempotent-rebook vs
    // slot-taken. This pre-check only rejects times the doctor never offers
    // (off-schedule, time-off, wrong duration).
    const scheduledAt = localWallClockToInstant(date, time, clinic.timezone);
    if (scheduledAt.getTime() < Date.now()) {
      return ok({ booked: false, reason: "slot_unavailable" });
    }
    const { from, to } = localDayBoundsUTC(date);
    const slots = await computeAvailability(staff, {
      doctorId: doctor.id,
      from,
      to,
      timezone: clinic.timezone,
      includeTaken: true,
    });
    const wantedISO = scheduledAt.toISOString();
    const slot = slots.find((s) => s.start === wantedISO);
    if (!slot) {
      return ok({ booked: false, reason: "slot_unavailable" });
    }
    const durationMin = Math.max(
      1,
      Math.round(
        (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
      ),
    );

    // Phase 11 — patient-level conflict guard. The DB unique constraint is per
    // doctor, so the SAME patient could otherwise hold two appointments at the
    // same clock time with different doctors. We refuse and return the
    // conflicting appointment(s) for the agent to read back UNLESS the override is
    // proven: `confirm` alone is not enough (a model can set it before the warning
    // was ever spoken), so the agent must also echo the `conflictAckIds` it was
    // shown — see `conflictsAcknowledged`. A same-doctor overlap here is either
    // the caller's own idempotent re-book or someone else's slot-taken — both
    // handled downstream, NOT a conflict.
    const conflicts = await findPatientTimeConflicts(staff, {
      phone,
      from: scheduledAt,
      to: new Date(scheduledAt.getTime() + durationMin * 60_000),
    });
    const cross = conflicts.filter((c) => c.doctorId !== doctor.id);
    const overrideProven =
      confirm === true && conflictsAcknowledged(cross, conflictAckIds);
    if (cross.length > 0 && !overrideProven) {
      return ok({
        booked: false,
        reason: "conflict",
        conflicts: cross.map((c) => ({
          appointmentId: c.appointmentId,
          doctor: c.doctorName,
          date: toLocalDate(c.scheduledAt, clinic.timezone),
          time: toLocalTime(c.scheduledAt, clinic.timezone),
          status: c.status,
        })),
      });
    }

    // Write. Patient created here if the phone is new.
    const { appointment, idempotent } = await bookAppointmentForVoice(staff, {
      doctorId: doctor.id,
      scheduledAt,
      durationMin,
      type: "Consultation",
      phone,
      patientName,
    });

    return ok({
      booked: true,
      idempotent,
      appointmentId: appointment.id,
      patientId: appointment.patient.id,
      appointment: {
        doctor: appointment.doctor.name,
        patient: appointment.patient.fullName,
        date: toLocalDate(appointment.scheduledAt, clinic.timezone),
        time: toLocalTime(appointment.scheduledAt, clinic.timezone),
        status: appointment.status,
      },
    });
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return ok({ booked: false, reason: "slot_taken" });
    }
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
