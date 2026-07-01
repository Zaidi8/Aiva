// Aiva — tenant-scoped CallLog reads for the dashboard.

import "server-only";
import type { CallLog, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

export interface ListCallsOptions {
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
}

// Shape mirrors the `include` below so server callers get typed relations
// instead of a bare CallLog (the /api/calls JSON already carried these).
export type CallLogListItem = CallLog & {
  patient: { id: string; fullName: string } | null;
  appointment: { id: string; scheduledAt: Date } | null;
};

export async function listCalls(
  staff: Pick<ClinicStaff, "clinicId">,
  opts: ListCallsOptions = {},
): Promise<{ items: CallLogListItem[]; total: number }> {
  const where = {
    ...clinicWhere(staff),
    ...(opts.from || opts.to
      ? {
          startedAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
      include: {
        patient: { select: { id: true, fullName: true } },
        appointment: { select: { id: true, scheduledAt: true } },
      },
    }),
    prisma.callLog.count({ where }),
  ]);
  return { items, total };
}

export async function getCall(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
) {
  return prisma.callLog.findFirst({
    where: { id, ...clinicWhere(staff) },
    include: {
      patient: { select: { id: true, fullName: true, phoneNumber: true } },
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          doctor: { select: { id: true, name: true } },
        },
      },
    },
  });
}
