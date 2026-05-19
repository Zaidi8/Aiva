// Tenant-scoped write helpers for the Patient model.
//
// Updates and deletes use updateMany/deleteMany (not update/delete) so a
// cross-tenant attempt returns count: 0 instead of throwing P2025. That
// pattern lets callers treat "not found" and "not yours" identically —
// surface a 404 from the route handler without leaking existence of rows
// in other clinics.
//
// Patient has no soft-delete column; deletePatient is a real DELETE. The
// Appointment / CallLog / Notification rows that reference the patient cascade
// per the schema's onDelete rules.

import "server-only";

import type { ClinicStaff } from "@prisma/client";

import { clinicWhere } from "@/lib/clinic-scope";
import { prisma } from "@/lib/prisma";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "@/lib/validations/patient";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

// Insert a new patient owned by the caller's clinic. clinicId is set from the
// staff context — never trust a clinicId in the request body.
export async function createPatient(
  staff: ScopedStaff,
  input: CreatePatientInput,
) {
  return prisma.patient.create({
    data: { ...input, clinicId: staff.clinicId },
  });
}

// Patch an existing patient. Returns the updated row, or null if no row in
// the caller's clinic matched the id (either deleted or owned by another
// tenant). updateMany applies the clinicId filter; findUniqueOrThrow after a
// successful update is safe because we just confirmed the row exists.
export async function updatePatient(
  staff: ScopedStaff,
  id: string,
  input: UpdatePatientInput,
) {
  const result = await prisma.patient.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: input,
  });

  if (result.count === 0) return null;

  return prisma.patient.findUniqueOrThrow({ where: { id } });
}

// Hard delete. Returns true if a row in the caller's clinic was removed,
// false otherwise. Callers should map false → 404.
export async function deletePatient(staff: ScopedStaff, id: string) {
  const result = await prisma.patient.deleteMany({
    where: { id, ...clinicWhere(staff) },
  });
  return result.count > 0;
}
