// Aiva — read helper for the single Clinic row a staff member belongs to.
//
// Clinic is implicitly tenant-scoped because every staff row carries the
// clinicId. We expose a tiny helper that returns the caller's clinic so the
// dashboard's Settings → Profile tab and any future settings UI doesn't have
// to know that the join lives on ClinicStaff.

import "server-only";
import type { Clinic, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getClinic(
  staff: Pick<ClinicStaff, "clinicId">,
): Promise<Clinic | null> {
  return prisma.clinic.findUnique({ where: { id: staff.clinicId } });
}
