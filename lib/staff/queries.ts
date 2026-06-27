// Aiva — tenant-scoped staff reads for the Team page.

import "server-only";
import type { ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

// Client-safe projection (no authUserId).
export type StaffListItem = Pick<
  ClinicStaff,
  "id" | "fullName" | "email" | "role" | "jobTitle" | "phone" | "createdAt"
>;

export async function listStaff(
  staff: Pick<ClinicStaff, "clinicId">,
): Promise<StaffListItem[]> {
  return prisma.clinicStaff.findMany({
    where: { ...clinicWhere(staff), deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      createdAt: true,
    },
  });
}
