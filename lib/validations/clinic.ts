// Aiva — Clinic zod schema. PATCH-only (the row is provisioned at register).
//
// Field rules mirror prisma/schema.prisma:
//   • name        required → keep non-empty
//   • phone, address, email, voicePhone, timezone → all optional, nullable
//   • timezone defaults to "Asia/Karachi" in the DB; we don't force it here
//
// Empty strings on optional fields are normalised to `undefined` (omit) so
// the dashboard form can submit "" without us writing `phone: ""` to the DB.

import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .pipe(z.string().email("Email must be a valid email address.").optional());

export const updateClinicSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Clinic name is required.")
    .max(120, "Clinic name must be 120 characters or fewer.")
    .optional(),
  phone: optionalTrimmed(32),
  address: optionalTrimmed(500),
  email: optionalEmail,
  // voicePhone is the inbound number patients dial. Setting it from the
  // dashboard is supported (the AI module owns the actual provisioning, but
  // editing the stored value is fine — Clinic.voicePhone @unique enforces
  // collisions across tenants).
  voicePhone: optionalTrimmed(32),
  // IANA tz name (e.g. "Asia/Karachi", "America/New_York"). We don't validate
  // against the full list here — Postgres will accept the string; the
  // scheduler treats unknown zones as UTC.
  timezone: optionalTrimmed(64),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
