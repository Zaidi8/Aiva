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

const MAX_SLOTS = 12; // cap for any "sampled" list (exact-time branch Phase 5)
const MINUTES_IN_DAY = 24 * 60; // Phase 10 window: default half-open edge.

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
    // Phase 10: optional clinic-local time WINDOW edges ("HH:mm", 24h). Either
    // may be absent (half-open bound). When at least one is present the branch
    // below reports the slots INSIDE the window plus the nearest open slot just
    // outside each edge instead of dumping the whole day.
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, doctorName, date, time, from, to } = parsed.data;
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

    // Clinic-local day bounds as UTC instants. Named `dayFrom`/`dayTo` so they
    // can't shadow the Phase 10 window's `from`/`to` ("HH:mm" string edges) that
    // the window branch below reads from the parsed query.
    const { from: dayFrom, to: dayTo } = localDayBoundsUTC(date);
    const slots = await computeAvailability(staff, {
      doctorId: doctor.id,
      from: dayFrom,
      to: dayTo,
      timezone: clinic.timezone,
    });

    // Slots are true instants; keep only those whose clinic-local date matches
    // the requested day (the ±1-day padded bounds can include neighbour days),
    // and that are still in the FUTURE. Dropping past slots is essential: the
    // booking endpoint rejects any time < now (book/route.ts), so offering an
    // already-passed slot makes the agent suggest it, fail to book it, apologise,
    // suggest the next-nearest (also past), and loop. computeAvailability returns
    // the whole day's grid with no time-of-day cutoff, so we filter here. The
    // `> now` bound is stricter than booking's `< now` reject, so anything we
    // offer is bookable (no availability/booking mismatch).
    const now = Date.now();
    const times = slots
      .filter((s) => new Date(s.start).getTime() > now)
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

    // Phase 10: clinic-local time WINDOW ("between 4 and 5", "morning", "after
    // 2"). When the caller named a bound (either edge optional / half-open),
    // don't dump the whole day — report which slots INSIDE the window are open,
    // plus the single nearest open slot just before `from` and just after `to`
    // (so the agent can still offer a real, near-neighbour alternative if the
    // window itself is empty, without making it book a far-away arbitrary slot).
    // The window is expressed in clinic-local minutes for the day already being
    // reported.
    if (from || to) {
      const fromMin = from ? toMinutes(from) : 0;
      const toMin = to ? toMinutes(to) : MINUTES_IN_DAY;
      const inWindow = times
        .filter((t) => toMinutes(t) >= fromMin && toMinutes(t) <= toMin)
        .slice(0, MAX_SLOTS);
      const before = times
        .filter((t) => toMinutes(t) < fromMin)
        .at(-1); // nearest open slot just BEFORE the window edge
      const after = times
        .filter((t) => toMinutes(t) > toMin)
        .at(0); // nearest open slot just AFTER the window edge (times are 24h-sorted)
      return ok({
        resolved: true,
        doctor: { name: doctor.name, specialization: doctor.specialization },
        date,
        timezone: clinic.timezone,
        window: { from: from ?? null, to: to ?? null },
        openInWindow: inWindow,
        totalOpenInWindow: times.filter(
          (t) => toMinutes(t) >= fromMin && toMinutes(t) <= toMin
        ).length,
        nearestBefore: before ?? null,
        nearestAfter: after ?? null,
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
