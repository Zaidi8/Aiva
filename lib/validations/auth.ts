// Zod schemas for auth-related Server Actions.
//
// Sign-up is deliberately minimal — it only provisions a Clinic + an Admin
// login. Everything else (clinic contact details, doctors, schedules, team,
// AI settings) is collected afterwards in the /onboarding flow, so the
// registration form stays to four fields.

import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Email must be a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(1, "Full name is required."),
  clinicName: z
    .string()
    .trim()
    .transform((v) => (v === "" ? "My Clinic" : v))
    .pipe(z.string().min(1)),
});

export type RegisterInput = z.infer<typeof registerSchema>;
