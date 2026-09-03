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
  // Baseline length check only. For a healthcare product, enable Supabase
  // Auth's built-in password-strength requirement + Leaked Password Protection
  // (HIBP) in the dashboard (Authentication → Policies) — that enforces
  // complexity and blocks known-breached passwords at the source, which a
  // client-side zod rule can't. Keep this in sync if the Supabase minimum
  // changes.
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(1, "Full name is required."),
  clinicName: z
    .string()
    .trim()
    .transform((v) => (v === "" ? "My Clinic" : v))
    .pipe(z.string().min(1)),
});

// Self-service password change from Settings → Security. The caller must
// confirm their CURRENT password (verified against Supabase Auth) and then
// supply a new one that meets the same minimum. Mirror the error style used
// elsewhere in Settings so the client can surface field-level errors.
const newPassword = z
  .string()
  .min(8, "New password must be at least 8 characters.");

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required."),
    newPassword,
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
