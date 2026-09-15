// Build the clinic-context DTO consumed by the Python voice agent on every
// call. Single Prisma query with nested includes — no N+1. Shapes the result
// into the locked DTO (zod-validated in lib/validations/voice-context.ts).

import "server-only";
import { prisma } from "@/lib/prisma";
import type { ClinicContextDTO } from "@/lib/validations/voice-context";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_GREETING =
  "Hello! Thank you for calling. How may I help you today?";

// Normalize the clinic's openingHours JSON column (stored as
// [{ dayOfWeek, startTime, endTime }]) into a stable, day-sorted list. Returns
// [] when unset/malformed so the prompt falls back to "hours not on file".
type OpeningHour = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function normalizeOpeningHours(raw: unknown): OpeningHour[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const hours: OpeningHour[] = [];
  for (const entry of raw as OpeningHour[]) {
    if (!entry || typeof entry !== "object") continue;
    const day = Number(entry.dayOfWeek);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (seen.has(day)) continue; // last valid entry for a day wins
    const start = entry.startTime;
    const end = entry.endTime;
    if (typeof start !== "string" || typeof end !== "string") continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) continue;
    seen.add(day);
    hours.push({ dayOfWeek: day, startTime: start, endTime: end });
  }
  return hours.sort(
    (a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek),
  );
}

export async function getClinicContext(
  clinicId: string,
): Promise<ClinicContextDTO | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: {
      aiSettings: true,
      doctors: {
        include: {
          schedules: true,
          timeOff: true,
        },
      },
    },
  });

  if (!clinic) return null;

  const doctors = clinic.doctors
    .map((d) => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      // Years of practice → lets the agent recommend the senior-most doctor.
      experienceYears: d.experienceYears,
      schedule: d.schedules
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayName: DAY_NAMES[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      // Upcoming planned time off (only future ranges — past leave is noise).
      timeOff: d.timeOff
        .filter((t) => t.endDate >= new Date())
        .map((t) => ({
          startDate: t.startDate.toISOString().slice(0, 10),
          endDate: t.endDate.toISOString().slice(0, 10),
        }))
        .sort((a, b) => (a.startDate < b.startDate ? -1 : 1)),
    }))
    // Senior-most first: doctors sort by experience desc, then name — so the
    // first name in the prompt is the most experienced, which the prompt tells
    // the agent to lead with when a caller has no preference.
    .sort((a, b) => (b.experienceYears ?? 0) - (a.experienceYears ?? 0) ||
      a.name.localeCompare(b.name));

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      timezone: clinic.timezone,
      openingHours: normalizeOpeningHours(clinic.openingHours),
    },
    ai: {
      agentName: clinic.aiSettings?.agentName ?? "Aiva",
      greetingMessage: clinic.aiSettings?.greetingMessage ?? DEFAULT_GREETING,
      autoBook: clinic.aiSettings?.autoBook ?? false,
      handleRescheduling: clinic.aiSettings?.handleRescheduling ?? false,
      emergencyTransfer: clinic.aiSettings?.emergencyTransfer ?? false,
    },
    doctors,
    services: [],
    policies: { emergency: null, cancellation: null },
    fetchedAt: new Date().toISOString(),
  };
}
