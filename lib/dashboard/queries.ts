// Aiva — single aggregate query that powers the dashboard stat tiles.
//
// One round-trip via Promise.all keeps the dashboard render cheap, instead
// of waterfall-fetching from 6 different endpoints. All counts respect the
// caller's clinic via clinicWhere(staff).
//
// "Today" boundaries are computed in the caller's process timezone — which
// the Next runtime defaults to UTC in prod. That's good enough for "today's
// appointments" tile semantics (the appointment scheduledAt is stored in UTC
// already). If clinic-local "today" becomes important we can plumb
// clinic.timezone through later — schema already supports it.

import "server-only";
import type { ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

export interface DashboardSummary {
  todayAppointments: number;
  pendingApprovals: number;
  cancellationsToday: number;
  callsHandledToday: number;
  bookingsMadeToday: number;
  successRate: number; // 0–100, integer; 0 when no calls today
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
function endOfTodayUTC(): Date {
  const s = startOfTodayUTC();
  return new Date(s.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export async function getDashboardSummary(
  staff: Pick<ClinicStaff, "clinicId">,
): Promise<DashboardSummary> {
  const from = startOfTodayUTC();
  const to = endOfTodayUTC();
  const scope = clinicWhere(staff);

  const [
    todayAppointments,
    pendingApprovals,
    cancellationsToday,
    callsHandledToday,
    bookingsMadeToday,
    callsCompletedToday,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { ...scope, scheduledAt: { gte: from, lte: to } },
    }),
    prisma.appointment.count({
      where: { ...scope, status: "Pending" },
    }),
    prisma.appointment.count({
      where: {
        ...scope,
        status: "Cancelled",
        updatedAt: { gte: from, lte: to },
      },
    }),
    prisma.callLog.count({
      where: { ...scope, startedAt: { gte: from, lte: to } },
    }),
    prisma.callLog.count({
      where: {
        ...scope,
        startedAt: { gte: from, lte: to },
        detectedIntent: "Booking",
        outcome: "Completed",
      },
    }),
    prisma.callLog.count({
      where: {
        ...scope,
        startedAt: { gte: from, lte: to },
        outcome: "Completed",
      },
    }),
  ]);

  const successRate =
    callsHandledToday === 0
      ? 0
      : Math.round((callsCompletedToday / callsHandledToday) * 100);

  return {
    todayAppointments,
    pendingApprovals,
    cancellationsToday,
    callsHandledToday,
    bookingsMadeToday,
    successRate,
  };
}
