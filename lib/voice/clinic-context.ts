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
      schedule: d.schedules
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayName: DAY_NAMES[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      timezone: clinic.timezone,
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
