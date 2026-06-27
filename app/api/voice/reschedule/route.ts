// Aiva — Phase 6 voice tool: reschedule an appointment (WRITE).
//
// Called by the Python agent's `reschedule_appointment` tool AFTER it has read
// the move back to the caller (from old time → new time, same doctor) and gotten
// a spoken yes. Resolves the doctor, converts both clinic-local date+times to
// true instants, verifies the NEW slot is a real schedulable slot, then moves the
// caller's matching appointment. Double-book safety is the @@unique DB guard.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/prisma";
import { listActiveDoctors } from "@/lib/doctors/queries";
import { matchDoctor } from "@/lib/voice/doctor-match";
import { computeAvailability } from "@/lib/appointments/queries";
import { rescheduleAppointmentForVoice } from "@/lib/appointments/mutations";
import {
  localWallClockToInstant,
  localDayBoundsUTC,
  toLocalTime,
  toLocalDate,
} from "@/lib/voice/tz";
import { voiceRescheduleBodySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

export const POST = withWebhookSecret(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = voiceRescheduleBodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, doctorName, date, time, newDate, newTime, phone } =
    parsed.data;
  const staff = { clinicId };

  try {
    // findUnique by Clinic PK is safe: Clinic is the tenant root, not a child.
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
      return ok({ rescheduled: false, reason: "not_found", doctorName });
    }
    if (match.matched === "many") {
      return ok({
        rescheduled: false,
        reason: "ambiguous",
        candidates: (match.candidates ?? []).map((d) => d.name),
      });
    }
    const doctor = match.doctor!;

    const fromScheduledAt = localWallClockToInstant(date, time, clinic.timezone);
    const toScheduledAt = localWallClockToInstant(
      newDate,
      newTime,
      clinic.timezone,
    );

    // The new time must be in the future and a real schedulable slot for this
    // doctor. Same grid validation as booking (includeTaken: validate against
    // the schedule, let the DB unique guard decide free-vs-taken).
    if (toScheduledAt.getTime() < Date.now()) {
      return ok({ rescheduled: false, reason: "slot_unavailable" });
    }
    const { from, to } = localDayBoundsUTC(newDate);
    const slots = await computeAvailability(staff, {
      doctorId: doctor.id,
      from,
      to,
      timezone: clinic.timezone,
      includeTaken: true,
    });
    const wantedISO = toScheduledAt.toISOString();
    const slot = slots.find((s) => s.start === wantedISO);
    if (!slot) {
      return ok({ rescheduled: false, reason: "slot_unavailable" });
    }
    const durationMin = Math.max(
      1,
      Math.round(
        (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
      ),
    );

    const result = await rescheduleAppointmentForVoice(staff, {
      phone,
      doctorId: doctor.id,
      fromScheduledAt,
      toScheduledAt,
      durationMin,
    });
    if (!result.rescheduled) {
      return ok({ rescheduled: false, reason: result.reason });
    }

    return ok({
      rescheduled: true,
      appointment: {
        doctor: result.appointment.doctor.name,
        patient: result.appointment.patient.fullName,
        date: toLocalDate(result.appointment.scheduledAt, clinic.timezone),
        time: toLocalTime(result.appointment.scheduledAt, clinic.timezone),
        status: result.appointment.status,
      },
    });
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
