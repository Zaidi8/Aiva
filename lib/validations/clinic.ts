// Aiva — Clinic zod schema. PATCH-only (the row is provisioned at register).
//
// Field rules mirror prisma/schema.prisma:
//   • name        required → keep non-empty
//   • phone, address, email, voicePhone, timezone → all optional, nullable
//   • timezone MUST be a real IANA zone. It's the source of truth for every
//     availability/booking computation, which run it through
//     Intl.DateTimeFormat — an INVALID zone throws RangeError and 500s the
//     voice booking/availability endpoints, so we reject it at the edge here.
//
// Empty strings on optional fields are normalised to `undefined` (omit) so
// the dashboard form can submit "" without us writing `phone: ""` to the DB.

import { z } from "zod";

// True only for zones Intl accepts. Probing via DateTimeFormat is the most
// portable check (works even where Intl.supportedValuesOf is unavailable).
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

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
  // voicePhone is the inbound number patients dial. The voice runtime resolves
  // a clinic by exact-matching the dialed number against this field, so the
  // mutation normalizes it to a canonical form before writing (see
  // lib/clinics/mutations.ts). @@unique enforces no collisions across tenants.
  voicePhone: optionalTrimmed(32),
  // IANA tz name (e.g. "Asia/Karachi", "America/New_York"). Validated as a real
  // zone — an unknown zone is NOT silently treated as UTC; Intl throws on it.
  timezone: optionalTrimmed(64).refine(
    (v) => v === undefined || isValidTimeZone(v),
    { message: "Enter a valid IANA timezone (e.g. Asia/Karachi)." },
  ),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
