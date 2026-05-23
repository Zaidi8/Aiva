// Aiva — Doctor zod schemas.
//
// The deprecated availableSlots / workingHours JSON columns are intentionally
// NOT accepted by these schemas — use the DoctorSchedule / DoctorTimeOff tables
// once exposed via their own API. Keeping the surface clean prevents drift.

import { z } from "zod";

export const createDoctorSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  specialization: z.string().trim().min(1, "Specialization is required.").max(120),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .min(5)
    .max(32)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
