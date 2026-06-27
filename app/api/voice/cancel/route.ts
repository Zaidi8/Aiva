// Aiva — Phase 6 voice tool: cancel an appointment (WRITE).
//
// Called by the Python agent's `cancel_appointment` tool AFTER it has read the
// appointment back to the caller and gotten a spoken yes. Resolves the spoken
// doctor name, converts the clinic-local date+time to a true instant, then
// marks the caller's matching appointment Cancelled. The caller is identified by
// phone; no DB ids cross the voice boundary.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/prisma";
import { listActiveDoctors } from "@/lib/doctors/queries";
import { matchDoctor } from "@/lib/voice/doctor-match";
import { cancelAppointmentForVoice } from "@/lib/appointments/mutations";
import {
  localWallClockToInstant,
  toLocalTime,
  toLocalDate,
} from "@/lib/voice/tz";
import { voiceCancelBodySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

export const POST = withWebhookSecret(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = voiceCancelBodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, doctorName, date, time, phone } = parsed.data;
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
      return ok({ cancelled: false, reason: "not_found", doctorName });
    }
    if (match.matched === "many") {
      return ok({
        cancelled: false,
        reason: "ambiguous",
        candidates: (match.candidates ?? []).map((d) => d.name),
      });
    }
    const doctor = match.doctor!;

    const scheduledAt = localWallClockToInstant(date, time, clinic.timezone);
    const result = await cancelAppointmentForVoice(staff, {
      phone,
      doctorId: doctor.id,
      scheduledAt,
    });
    if (!result.cancelled) {
      return ok({ cancelled: false, reason: result.reason });
    }

    return ok({
      cancelled: true,
      appointment: {
        doctor: result.appointment.doctor.name,
        patient: result.appointment.patient.fullName,
        date: toLocalDate(result.appointment.scheduledAt, clinic.timezone),
        time: toLocalTime(result.appointment.scheduledAt, clinic.timezone),
        status: "Cancelled",
      },
    });
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
