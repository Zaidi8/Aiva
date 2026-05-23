// Aiva — tenant-scoped doctor writes.
//
// Delete is a soft-delete (set deactivatedAt) because Appointment.doctorId has
// onDelete: Restrict. Hard-deleting a doctor with appointments would 500.

import "server-only";
import type { ClinicStaff, Doctor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
} from "@/lib/validations/doctor";

export function createDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
  input: CreateDoctorInput,
): Promise<Doctor> {
  return prisma.doctor.create({
    data: { ...input, clinicId: staff.clinicId },
  });
}

export async function updateDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
  input: UpdateDoctorInput,
): Promise<Doctor | null> {
  const result = await prisma.doctor.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: input,
  });
  if (result.count === 0) return null;
  return prisma.doctor.findUniqueOrThrow({ where: { id } });
}

// Soft delete by stamping deactivatedAt. Hard-delete is unsafe because
// appointment.doctorId has onDelete: Restrict.
export async function deactivateDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
): Promise<boolean> {
  const result = await prisma.doctor.updateMany({
    where: { id, ...clinicWhere(staff), deactivatedAt: null },
    data: { deactivatedAt: new Date() },
  });
  return result.count > 0;
}

export async function reactivateDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
): Promise<boolean> {
  const result = await prisma.doctor.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: { deactivatedAt: null },
  });
  return result.count > 0;
}
