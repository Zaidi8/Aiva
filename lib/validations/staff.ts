// Aiva — ClinicStaff zod schemas (own-profile edit + team management).

import { z } from "zod";
import { StaffRole } from "@prisma/client";

const optionalPhone = z
  .string()
  .trim()
  .min(5)
  .max(32)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalJobTitle = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal("").transform(() => undefined));

// Self-service edit of the caller's OWN profile. Email is owned by Supabase
// Auth and role is privileged — neither is editable here.
export const updateMeSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(120).optional(),
  phone: optionalPhone,
  jobTitle: optionalJobTitle,
});

// Admin creates a new dashboard login for the clinic.
export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().email("Enter a valid email."),
  role: z.nativeEnum(StaffRole),
  jobTitle: optionalJobTitle,
  phone: optionalPhone,
});

export const updateStaffRoleSchema = z.object({
  role: z.nativeEnum(StaffRole),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
