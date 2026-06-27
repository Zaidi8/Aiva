// Aiva — Phase 3 voice tool: check a doctor's open slots on a date (read-only).
//
// Called by the Python agent's `check_availability` tool. Resolves the spoken
// doctor name to a doctor, builds the clinic-local day bounds, and delegates
// the slot math to the existing computeAvailability helper.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/prisma";
import { listActiveDoctors } from "@/lib/doctors/queries";
import { matchDoctor } from "@/lib/voice/doctor-match";
import { computeAvailability } from "@/lib/appointments/queries";
import { localDayBoundsUTC, toLocalTime, toLocalDate } from "@/lib/voice/tz";
import { voiceAvailabilityQuerySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

const MAX_SLOTS = 12;

// "HH:mm" clinic-local → minutes since midnight, for nearest-slot ranking.
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export const GET = withWebhookSecret(async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = voiceAvailabilityQuerySchema.safeParse({
    clinicId: searchParams.get("clinicId") ?? "",
    doctorName: searchParams.get("doctorName") ?? "",
    date: searchParams.get("date") ?? "",
    // optional: undefined when the caller didn't name a specific time.
    time: searchParams.get("time") || undefined,
  });
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, doctorName, date, time } = parsed.data;
  const staff = { clinicId };

  try {
    // NOTE: these reads are run sequentially on purpose. The DB connection is
    // pooled with connection_limit=1 (pgbouncer); firing them concurrently with
    // Promise.all caused connection contention and intermittent "can't reach
    // database server" 500s, with no speed gain (latency is geographic, not
    // concurrency-bound). Sequential is slower-looking but reliable.
    // findUnique by Clinic PK is safe: Clinic is the tenant root, not a
    // clinic-owned child, so there is no cross-tenant scope to apply.
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    if (!clinic) {
      return fail("CLINIC_NOT_FOUND", `No clinic with id ${clinicId}.`, 404);
    }

    const items = await listActiveDoctors(staff);

    // Tolerant match so "cardiologist" / "Dr Khan" resolve like a person would.
    const match = matchDoctor(items, doctorName);
    if (match.matched === "none") {
      return ok({ resolved: false, reason: "not_found", doctorName });
    }
    if (match.matched === "many") {
      return ok({
        resolved: false,
        reason: "ambiguous",
        candidates: (match.candidates ?? []).map((d) => d.name),
      });
    }
    const doctor = match.doctor!;

    const { from, to } = localDayBoundsUTC(date);
    const slots = await computeAvailability(staff, {
      doctorId: doctor.id,
      from,
      to,
      timezone: clinic.timezone,
    });

    // Slots are true instants; keep only those whose clinic-local date matches
    // the requested day (the ±1-day padded bounds can include neighbour days),
    // then render each as clinic-local "HH:mm" for speaking.
    const times = slots
      .filter((s) => toLocalDate(new Date(s.start), clinic.timezone) === date)
      .map((s) => toLocalTime(new Date(s.start), clinic.timezone));

    // Phase 5 (#3/#4): when the caller named a target time, don't dump the whole
    // day — report whether THAT exact time is open plus the few nearest open
    // alternatives (by clock distance). This keeps the agent focused on the
    // requested time and stops it offering/booking an arbitrary other slot.
    if (time) {
      const target = toMinutes(time);
      const requestedAvailable = times.includes(time);
      const nearest = [...times]
        .filter((t) => t !== time)
        .sort((a, b) => Math.abs(toMinutes(a) - target) - Math.abs(toMinutes(b) - target))
        .slice(0, 3);
      return ok({
        resolved: true,
        doctor: { name: doctor.name, specialization: doctor.specialization },
        date,
        timezone: clinic.timezone,
        requestedTime: time,
        requestedAvailable,
        nearest,
        totalSlots: times.length,
      });
    }

    return ok({
      resolved: true,
      doctor: { name: doctor.name, specialization: doctor.specialization },
      date,
      timezone: clinic.timezone,
      slots: times.slice(0, MAX_SLOTS),
      totalSlots: times.length,
    });
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
