// Aiva — tenant-scoped doctor reads.

import "server-only";
import type { ClinicStaff, Doctor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

export interface ListDoctorsOptions {
  q?: string;
  take?: number;
  skip?: number;
  includeDeactivated?: boolean;
}

export async function listDoctors(
  staff: Pick<ClinicStaff, "clinicId">,
  opts: ListDoctorsOptions = {},
): Promise<{ items: Doctor[]; total: number }> {
  const where = {
    ...clinicWhere(staff),
    ...(opts.includeDeactivated ? {} : { deactivatedAt: null }),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" as const } },
            { specialization: { contains: opts.q, mode: "insensitive" as const } },
            { phone: { contains: opts.q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    }),
    prisma.doctor.count({ where }),
  ]);
  return { items, total };
}

export async function getDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
): Promise<Doctor | null> {
  return prisma.doctor.findFirst({
    where: { id, ...clinicWhere(staff) },
  });
}
