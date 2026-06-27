// Aiva — tenant-scoped notification reads for the TopBar bell.
//
// IMPORTANT: Notification has no direct clinicId column. The tenant link
// goes through `patient.clinicId`, so every where-clause MUST include
// `patient: { clinicId: staff.clinicId }`. Forgetting that is exactly the
// cross-tenant leak class clinic-scope.ts warns about.
//
// "Unread" semantics: we don't have a `readAt` column on Notification, only
// `status` (Pending / Sent / Failed). For the bell badge we treat status
// in ('Pending', 'Failed') as "needs attention" — those are the only ones a
// human should still react to (a successfully Sent notification doesn't
// generate an alert in the dashboard).

import "server-only";
import type { ClinicStaff, Notification, NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

export interface ListNotificationsOptions {
  // Server-side filter on the row's status. Default: all statuses.
  status?: NotificationStatus | NotificationStatus[];
  take?: number;
  skip?: number;
}

export type NotificationListItem = Notification & {
  patient: { id: string; fullName: string };
  appointment: { id: string; scheduledAt: Date } | null;
};

export async function listNotifications(
  staff: ScopedStaff,
  opts: ListNotificationsOptions = {},
): Promise<{ items: NotificationListItem[]; total: number; unread: number }> {
  const where = {
    patient: { clinicId: staff.clinicId },
    ...(opts.status
      ? Array.isArray(opts.status)
        ? { status: { in: opts.status } }
        : { status: opts.status }
      : {}),
  };

  // Sequential, not Promise.all: the Supabase pooler is connection_limit=1, so
  // firing three concurrent queries down one connection — alongside the auth
  // query and the sibling dashboard fetches on mount — intermittently 500s.
  // Serializing keeps each query on the single connection in turn. Same rule
  // the appointment + dashboard helpers follow.
  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
    skip: opts.skip ?? 0,
    include: {
      patient: { select: { id: true, fullName: true } },
      appointment: { select: { id: true, scheduledAt: true } },
    },
  });
  const total = await prisma.notification.count({ where });
  const unread = await prisma.notification.count({
    where: {
      patient: { clinicId: staff.clinicId },
      status: { in: ["Pending", "Failed"] },
    },
  });

  return { items, total, unread };
}
