// Aiva — aggregate query that powers the dashboard stat tiles.
//
// The six counts are issued SEQUENTIALLY, not via Promise.all. The Supabase
// pooler runs with connection_limit=1 (pgbouncer transaction mode); firing
// six concurrent queries down a single connection — on top of the auth query
// and the sibling /api/notifications + /api/appointments calls the dashboard
// fires on mount — intermittently overruns the pooler and 500s. Serializing
// keeps every query on the one connection in turn. Same rule the appointment
// helpers follow (see lib/appointments/queries.ts). All counts respect the
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
  // Onboarding/setup signals — drive the dashboard checklist for new clinics.
  doctorCount: number;
  scheduledDoctorCount: number; // doctors with at least one weekly schedule row
  patientCount: number;
  staffCount: number; // active dashboard logins in the clinic
  aiConfigured: boolean; // voicePhone set (the AI receptionist is reachable)
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

  const todayAppointments = await prisma.appointment.count({
    where: { ...scope, scheduledAt: { gte: from, lte: to } },
  });
  const pendingApprovals = await prisma.appointment.count({
    where: { ...scope, status: "Pending" },
  });
  const cancellationsToday = await prisma.appointment.count({
    where: {
      ...scope,
      status: "Cancelled",
      updatedAt: { gte: from, lte: to },
    },
  });
  const callsHandledToday = await prisma.callLog.count({
    where: { ...scope, startedAt: { gte: from, lte: to } },
  });
  const bookingsMadeToday = await prisma.callLog.count({
    where: {
      ...scope,
      startedAt: { gte: from, lte: to },
      detectedIntent: "Booking",
      outcome: "Completed",
    },
  });
  const callsCompletedToday = await prisma.callLog.count({
    where: {
      ...scope,
      startedAt: { gte: from, lte: to },
      outcome: "Completed",
    },
  });

  const successRate =
    callsHandledToday === 0
      ? 0
      : Math.round((callsCompletedToday / callsHandledToday) * 100);

  // Setup signals for the onboarding checklist. Still sequential — same
  // connection_limit=1 rule as the counts above.
  const doctorCount = await prisma.doctor.count({
    where: { ...scope, deactivatedAt: null },
  });
  const scheduledDoctorCount = await prisma.doctor.count({
    where: { ...scope, deactivatedAt: null, schedules: { some: {} } },
  });
  const patientCount = await prisma.patient.count({ where: scope });
  const staffCount = await prisma.clinicStaff.count({
    where: { ...scope, deactivatedAt: null },
  });
  const clinic = await prisma.clinic.findUnique({
    where: { id: staff.clinicId },
    select: { voicePhone: true },
  });
  const aiConfigured = !!clinic?.voicePhone;

  return {
    todayAppointments,
    pendingApprovals,
    cancellationsToday,
    callsHandledToday,
    bookingsMadeToday,
    successRate,
    doctorCount,
    scheduledDoctorCount,
    patientCount,
    staffCount,
    aiConfigured,
  };
}
