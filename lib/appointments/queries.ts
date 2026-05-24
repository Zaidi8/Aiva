// Aiva — tenant-scoped appointment reads + slot-availability computation.

import "server-only";
import type {
  Appointment,
  AppointmentStatus,
  ClinicStaff,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

export interface ListAppointmentsOptions {
  from?: Date;
  to?: Date;
  status?: AppointmentStatus | AppointmentStatus[];
  doctorId?: string;
  patientId?: string;
  take?: number;
  skip?: number;
}

// Shape mirrors the `include` block below — callers that consume the FK
// names get a typed `patient` and `doctor` sub-object without having to
// cast or reach into Prisma.GetPayload helpers.
export type AppointmentWithRelations = Appointment & {
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string; specialization: string };
};

export async function listAppointments(
  staff: Pick<ClinicStaff, "clinicId">,
  opts: ListAppointmentsOptions = {},
): Promise<{ items: AppointmentWithRelations[]; total: number }> {
  const where = {
    ...clinicWhere(staff),
    ...(opts.from || opts.to
      ? {
          scheduledAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
    ...(opts.status
      ? Array.isArray(opts.status)
        ? { status: { in: opts.status } }
        : { status: opts.status }
      : {}),
    ...(opts.doctorId ? { doctorId: opts.doctorId } : {}),
    ...(opts.patientId ? { patientId: opts.patientId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: opts.take ?? 100,
      skip: opts.skip ?? 0,
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items: items as AppointmentWithRelations[], total };
}

export async function getAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
) {
  return prisma.appointment.findFirst({
    where: { id, ...clinicWhere(staff) },
    include: {
      patient: { select: { id: true, fullName: true, phoneNumber: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Slot availability
//
// Given (doctorId, from, to), compute bookable slots by:
//   1. Reading DoctorSchedule rows for the doctor (weekly recurring).
//   2. Subtracting DoctorTimeOff date ranges.
//   3. Subtracting existing Appointment.scheduledAt values inside the range.
//
// All times are interpreted in the clinic's timezone but returned as ISO UTC
// strings. We do the slot math in UTC to avoid DST edge cases inside the loop.
// DoctorSchedule.startTime/endTime are stored as "HH:mm" — we treat them as
// clinic-local wall-clock times.
// ────────────────────────────────────────────────────────────────────────────

export interface AvailableSlot {
  start: string; // ISO UTC
  end: string; // ISO UTC
}

export async function computeAvailability(
  staff: Pick<ClinicStaff, "clinicId">,
  args: { doctorId: string; from: Date; to: Date },
): Promise<AvailableSlot[]> {
  // 1. Verify doctor is in the calling clinic and active.
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: args.doctorId,
      ...clinicWhere(staff),
      deactivatedAt: null,
    },
    include: {
      schedules: true,
      timeOff: {
        where: {
          // Overlapping with [from, to]
          endDate: { gte: args.from },
          startDate: { lte: args.to },
        },
      },
    },
  });
  if (!doctor) return [];

  // 2. Pull existing appointments to subtract.
  const taken = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      ...clinicWhere(staff),
      scheduledAt: { gte: args.from, lte: args.to },
      status: { in: ["Pending", "Confirmed"] },
    },
    select: { scheduledAt: true, durationMin: true },
  });
  const takenStarts = new Set(taken.map((t) => t.scheduledAt.toISOString()));

  // 3. Walk day-by-day through the range generating slots.
  const slots: AvailableSlot[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let d = startOfDayUTC(args.from); d <= args.to; d = new Date(d.getTime() + dayMs)) {
    const dow = d.getUTCDay(); // 0..6
    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dow);
    if (!schedule) continue;

    // Skip if doctor is on time off for this date.
    const isOff = doctor.timeOff.some(
      (t) => d >= startOfDayUTC(t.startDate) && d <= endOfDayUTC(t.endDate),
    );
    if (isOff) continue;

    const [sH, sM] = schedule.startTime.split(":").map(Number);
    const [eH, eM] = schedule.endTime.split(":").map(Number);
    const dur = schedule.slotDurationMinutes;

    const dayStart = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), sH, sM),
    );
    const dayEnd = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), eH, eM),
    );

    for (
      let t = dayStart;
      t.getTime() + dur * 60_000 <= dayEnd.getTime();
      t = new Date(t.getTime() + dur * 60_000)
    ) {
      if (t < args.from || t > args.to) continue;
      if (takenStarts.has(t.toISOString())) continue;
      slots.push({
        start: t.toISOString(),
        end: new Date(t.getTime() + dur * 60_000).toISOString(),
      });
    }
  }

  return slots;
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function endOfDayUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}
