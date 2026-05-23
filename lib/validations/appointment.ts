// Aiva — Appointment zod schemas.

import { z } from "zod";
import { AppointmentType, AppointmentStatus } from "@prisma/client";

export const createAppointmentSchema = z.object({
  patientId: z.string().cuid("Invalid patient id."),
  doctorId: z.string().cuid("Invalid doctor id."),
  // ISO 8601 (e.g. "2026-06-01T14:00:00Z" or with a timezone offset)
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: "scheduledAt must be ISO 8601 with timezone." }),
  durationMin: z.coerce.number().int().min(5).max(480).optional().default(30),
  type: z.nativeEnum(AppointmentType),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().trim().max(2000).optional(),
});

// Update intentionally cannot move (patientId, doctorId, scheduledAt) — that
// would mean cancelling + re-booking. Reschedules are a separate flow.
export const updateAppointmentSchema = z.object({
  durationMin: z.coerce.number().int().min(5).max(480).optional(),
  type: z.nativeEnum(AppointmentType).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().trim().max(2000).optional(),
});

// Rescheduling needs its own endpoint because it must re-check slot uniqueness.
export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: "scheduledAt must be ISO 8601 with timezone." }),
  durationMin: z.coerce.number().int().min(5).max(480).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;

// Slot availability query — parse from URL search params.
export const availabilityQuerySchema = z.object({
  doctorId: z.string().cuid("doctorId is required."),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
