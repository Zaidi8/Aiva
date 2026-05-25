// Aiva — Voice agent clinic-context DTO.
//
// Returned by GET /api/voice/clinic-context, consumed by the Python voice
// worker on every call to render its system prompt. The shape is locked here
// so Python doesn't need to renegotiate when later phases fill the reserved
// `services` / `policies` slots.
//
// Day-of-week convention matches Prisma's DoctorSchedule: 0 = Sunday … 6 = Sat.

import { z } from "zod";

const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm in 24-hour format.");

const doctorScheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  dayName: z.string(),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
});

const doctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialization: z.string().nullable(),
  schedule: z.array(doctorScheduleEntrySchema),
});

export const clinicContextSchema = z.object({
  clinic: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    timezone: z.string(),
  }),
  ai: z.object({
    agentName: z.string(),
    greetingMessage: z.string(),
    autoBook: z.boolean(),
    handleRescheduling: z.boolean(),
    emergencyTransfer: z.boolean(),
  }),
  doctors: z.array(doctorSchema),
  services: z.array(z.never()),
  policies: z.object({
    emergency: z.null(),
    cancellation: z.null(),
  }),
  fetchedAt: z.string().datetime(),
});

export type ClinicContextDTO = z.infer<typeof clinicContextSchema>;
export type ClinicContextDoctor = z.infer<typeof doctorSchema>;
export type ClinicContextScheduleEntry = z.infer<
  typeof doctorScheduleEntrySchema
>;
