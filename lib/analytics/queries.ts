// Aiva — analytics aggregates for the Analytics page.
//
// Two payloads:
//   1. Tile totals (total patients, appts in range, completed in range,
//      growth-rate of appointments vs the previous equivalent range).
//   2. Two chart series:
//      • monthly — last 6 months of appointment / completed counts.
//      • weekly  — current 7-day window (Mon→Sun in process tz) booked /
//        confirmed / cancelled counts.
//
// Implementation note: we group-by-month and group-by-weekday in JS over a
// single Appointment list, instead of issuing N count() queries. Two reasons:
//   • Appointment volume is small (≤ thousands per clinic) — JS aggregation
//     is cheaper than 6+ round-trips.
//   • Keeps the Prisma calls type-safe; Postgres date_trunc would require
//     $queryRaw and lose the schema mapping.

import "server-only";
import type { AppointmentStatus, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

export type AnalyticsRange = "this-week" | "this-month" | "last-30d" | "this-year";

export interface AnalyticsMonthlyPoint {
  month: string; // "Jan", "Feb", …
  appointments: number;
  completed: number;
}
export interface AnalyticsWeeklyPoint {
  day: string; // "Mon", "Tue", …
  booked: number;
  confirmed: number;
  cancelled: number;
}

export interface AnalyticsPayload {
  range: AnalyticsRange;
  totals: {
    totalPatients: number;
    appointmentsInRange: number;
    completedInRange: number;
    growthRatePct: number; // +/- compared to the previous equivalent window
  };
  monthly: AnalyticsMonthlyPoint[]; // last 6 months, oldest→newest
  weekly: AnalyticsWeeklyPoint[]; // Mon→Sun of current week
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function rangeBounds(range: AnalyticsRange): {
  current: { from: Date; to: Date };
  previous: { from: Date; to: Date };
} {
  const now = new Date();
  const endOfDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  let from: Date;
  let prevFrom: Date;
  let prevTo: Date;

  switch (range) {
    case "this-week": {
      const day = now.getUTCDay(); // 0..6 (Sun..Sat)
      // Shift to Monday start (Mon=1). If day=0 (Sun), Monday was 6 days ago.
      const daysSinceMonday = (day + 6) % 7;
      from = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysSinceMonday,
        ),
      );
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "last-30d": {
      from = new Date(endOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(prevTo.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case "this-year": {
      from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      break;
    }
    case "this-month":
    default: {
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      break;
    }
  }

  return {
    current: { from, to: endOfDay },
    previous: { from: prevFrom, to: prevTo },
  };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export async function getAnalytics(
  staff: Pick<ClinicStaff, "clinicId">,
  range: AnalyticsRange = "this-month",
): Promise<AnalyticsPayload> {
  const scope = clinicWhere(staff);
  const { current, previous } = rangeBounds(range);

  // Window for the monthly chart — last 6 calendar months including current.
  const now = new Date();
  const monthlyFrom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );

  // Week window for weekly chart: same week start as "this-week".
  const wkBounds = rangeBounds("this-week").current;

  const [
    totalPatients,
    appointmentsInRange,
    completedInRange,
    appointmentsInPrev,
    monthlyRows,
    weeklyRows,
  ] = await Promise.all([
    prisma.patient.count({ where: scope }),
    prisma.appointment.count({
      where: { ...scope, scheduledAt: { gte: current.from, lte: current.to } },
    }),
    prisma.appointment.count({
      where: {
        ...scope,
        status: "Completed",
        scheduledAt: { gte: current.from, lte: current.to },
      },
    }),
    prisma.appointment.count({
      where: {
        ...scope,
        scheduledAt: { gte: previous.from, lte: previous.to },
      },
    }),
    prisma.appointment.findMany({
      where: { ...scope, scheduledAt: { gte: monthlyFrom, lte: current.to } },
      select: { scheduledAt: true, status: true },
    }),
    prisma.appointment.findMany({
      where: { ...scope, scheduledAt: { gte: wkBounds.from, lte: wkBounds.to } },
      select: { scheduledAt: true, status: true },
    }),
  ]);

  // ── Monthly aggregation ────────────────────────────────────────────────
  // Build 6 buckets keyed by YYYY-MM, oldest first.
  const monthly: AnalyticsMonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    monthly.push({ month: MONTH_LABELS[d.getUTCMonth()], appointments: 0, completed: 0 });
  }
  for (const row of monthlyRows) {
    const offset =
      (now.getUTCFullYear() - row.scheduledAt.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - row.scheduledAt.getUTCMonth());
    const idx = 5 - offset;
    if (idx < 0 || idx > 5) continue;
    monthly[idx].appointments += 1;
    if (row.status === "Completed") monthly[idx].completed += 1;
  }

  // ── Weekly aggregation ─────────────────────────────────────────────────
  // Buckets: Mon..Sun. We render Mon first because that's what the
  // dashboard chart currently expects.
  const weekly: AnalyticsWeeklyPoint[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day) => ({ day, booked: 0, confirmed: 0, cancelled: 0 }),
  );
  const statusBucket: Record<AppointmentStatus, keyof AnalyticsWeeklyPoint | null> = {
    Pending: "booked",
    Confirmed: "confirmed",
    Completed: "confirmed",
    Cancelled: "cancelled",
  };
  for (const row of weeklyRows) {
    const dow = row.scheduledAt.getUTCDay(); // 0..6 Sun..Sat
    const idx = (dow + 6) % 7; // Mon=0..Sun=6
    weekly[idx].booked += 1;
    const bucket = statusBucket[row.status];
    if (bucket && bucket !== "booked" && bucket !== "day") {
      (weekly[idx] as unknown as Record<string, number>)[bucket] += 1;
    }
  }

  return {
    range,
    totals: {
      totalPatients,
      appointmentsInRange,
      completedInRange,
      growthRatePct: pctChange(appointmentsInRange, appointmentsInPrev),
    },
    monthly,
    weekly,
  };
}
