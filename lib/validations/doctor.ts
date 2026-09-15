// Aiva — Doctor zod schemas.
//
// The deprecated availableSlots / workingHours JSON columns are intentionally
// NOT accepted by these schemas — use the DoctorSchedule / DoctorTimeOff tables
// once exposed via their own API. Keeping the surface clean prevents drift.

import { z } from "zod";

const yearsOfExperience = z
  .number()
  .int()
  .min(0)
  .max(70, "Must be 70 years or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

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
  // Years of practice — drives the AI receptionist's senior-most recommendation.
  experienceYears: yearsOfExperience,
});

export const updateDoctorSchema = createDoctorSchema.partial();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
