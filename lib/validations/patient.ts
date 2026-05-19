// Zod schemas for Patient create/update payloads. Field names mirror the
// Prisma `Patient` model in prisma/schema.prisma exactly so query/mutation
// helpers can spread the parsed input straight into Prisma calls.
//
// Notable Prisma facts this schema relies on:
//   • Patient.fullName is the display name (NOT `name`).
//   • Patient.phoneNumber is required; everything else nullable.
//   • Patient.medicalHistory is String[] — defaults to [] for create.
//   • Gender is a Prisma enum { Male, Female, Other }.

import { z } from "zod";
import { Gender } from "@prisma/client";

// Treat empty-string optional inputs the same as missing. The dashboard forms
// submit empty strings for fields the user didn't fill in; we don't want zod
// to flunk a valid "no email" submission on the .email() check.
const optionalTrimmedString = (max: number) =>
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

// Each medical-history tag must be a non-empty trimmed string; we cap the
// array at 100 entries to keep request bodies sane.
const medicalHistorySchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Medical history entries cannot be empty."),
  )
  .max(100, "Medical history is limited to 100 entries.")
  .default([]);

export const createPatientSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Patient name is required.")
    .max(120, "Patient name must be 120 characters or fewer."),
  phoneNumber: z
    .string()
    .trim()
    .min(5, "Phone number must be at least 5 characters.")
    .max(32, "Phone number must be 32 characters or fewer."),
  age: z.coerce
    .number()
    .int("Age must be an integer.")
    .min(0, "Age cannot be negative.")
    .max(130, "Age must be 130 or less.")
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  email: optionalEmail,
  address: optionalTrimmedString(500),
  medicalHistory: medicalHistorySchema,
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
