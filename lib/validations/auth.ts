// Zod schemas for auth-related Server Actions. Centralized here so the
// register form UI can later import the same shape if we move to client-side
// pre-validation.

import { z } from "zod";

// Treat empty-string optional fields the same as missing — the register form
// submits empty strings for fields the user didn't fill in.
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .pipe(z.string().email("Clinic email must be a valid email address.").optional());

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

  clinicPhone: optionalString,
  clinicAddress: optionalString,
  clinicEmail: optionalEmail,
  jobTitle: optionalString,
});

export type RegisterInput = z.infer<typeof registerSchema>;
