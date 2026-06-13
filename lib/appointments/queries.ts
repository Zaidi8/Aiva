// Aiva — tenant-scoped appointment reads + slot-availability computation.

import "server-only";
import type {
  Appointment,
  AppointmentStatus,
  ClinicStaff,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { localWallClockToInstant, toLocalDate } from "@/lib/voice/tz";

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

// Upcoming Pending/Confirmed appointments for one or more patients, in a SINGLE
// query. Used by the voice lookup tool. Unlike listAppointments it does no
// parallel count() — concurrent queries contend on the connection_limit=1
// pooler and intermittently fail. Batches all patient IDs with `in` rather than
// looping one query per patient.
export async function listUpcomingAppointmentsByPatients(
  staff: Pick<ClinicStaff, "clinicId">,
  args: { patientIds: string[]; from: Date; take?: number },
): Promise<AppointmentWithRelations[]> {
  if (args.patientIds.length === 0) return [];
  const items = await prisma.appointment.findMany({
    where: {
      ...clinicWhere(staff),
      patientId: { in: args.patientIds },
      scheduledAt: { gte: args.from },
      status: { in: ["Pending", "Confirmed"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: args.take ?? 5,
    include: {
      patient: { select: { id: true, fullName: true, phoneNumber: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  });
  return items as AppointmentWithRelations[];
}

// ────────────────────────────────────────────────────────────────────────────
// Slot availability
//
// Given (doctorId, from, to), compute bookable slots by:
//   1. Reading DoctorSchedule rows for the doctor (weekly recurring).
//   2. Subtracting DoctorTimeOff date ranges.
//   3. Subtracting existing Appointment.scheduledAt values inside the range.
//
// Phase 4: slots are returned as TRUE instants. DoctorSchedule.startTime/endTime
// are "HH:mm" clinic-local wall-clock; each is converted to its real UTC instant
// in `timezone` (09:00 Asia/Karachi => T04:00:00Z), matching how stored
// Appointment.scheduledAt works. This makes the booked-slot subtraction below and
// the @@unique([doctorId, scheduledAt]) booking guard line up exactly. (Before
// Phase 4 this used Date.UTC wall-clock, which didn't match stored instants.)
// ────────────────────────────────────────────────────────────────────────────

export interface AvailableSlot {
  start: string; // ISO UTC (true instant)
  end: string; // ISO UTC (true instant)
}

export async function computeAvailability(
  staff: Pick<ClinicStaff, "clinicId">,
  args: {
    doctorId: string;
    from: Date;
    to: Date;
    timezone: string;
    // When true, the schedule GRID is returned without subtracting already-booked
    // appointments — i.e. "every slot the doctor's schedule defines". Booking uses
    // this to validate that a requested time is a real schedulable slot, then lets
    // the DB unique constraint decide taken-vs-free (so idempotent re-books and
    // slot-taken can be distinguished by the mutation). Default false = free slots.
    includeTaken?: boolean;
  },
): Promise<AvailableSlot[]> {
  // 1. Verify doctor is in the calling clinic and active.
  // NOTE: kept sequential (not Promise.all with the appointments read). With
  // connection_limit=1 on the pooled DB, concurrent queries contend for the
  // single connection and intermittently fail with "can't reach database
  // server"; there is no speedup either, since the latency is geographic.
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

  // 2. Pull existing appointments to subtract (skipped when includeTaken).
  let takenStarts = new Set<string>();
  if (!args.includeTaken) {
    const taken = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        ...clinicWhere(staff),
        scheduledAt: { gte: args.from, lte: args.to },
        status: { in: ["Pending", "Confirmed"] },
      },
      select: { scheduledAt: true, durationMin: true },
    });
    // Booked instants to subtract. Both sides are now true instants, so the ISO
    // strings match exactly when a generated slot is already booked.
    takenStarts = new Set(taken.map((t) => t.scheduledAt.toISOString()));
  }

  // 3. Walk day-by-day. The schedule's dayOfWeek and "HH:mm" are clinic-LOCAL, so
  // we derive each day's local calendar date (in `timezone`) and convert local
  // wall-clock times to true instants. We iterate UTC days across the (padded)
  // range and dedupe by local date so each local day is visited exactly once
  // regardless of offset.
  const slots: AvailableSlot[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const seenLocalDates = new Set<string>();
  for (let d = startOfDayUTC(args.from); d <= args.to; d = new Date(d.getTime() + dayMs)) {
    const localDate = toLocalDate(d, args.timezone); // YYYY-MM-DD in clinic tz
    if (seenLocalDates.has(localDate)) continue;
    seenLocalDates.add(localDate);

    // dayOfWeek for the local date (parse as UTC midnight to read the weekday).
    const [ly, lm, ld] = localDate.split("-").map(Number);
    const dow = new Date(Date.UTC(ly, lm - 1, ld)).getUTCDay(); // 0..6
    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dow);
    if (!schedule) continue;

    // Skip if doctor is on time off for this local date (compare by local date).
    const isOff = doctor.timeOff.some((t) => {
      const offStart = toLocalDate(t.startDate, args.timezone);
      const offEnd = toLocalDate(t.endDate, args.timezone);
      return localDate >= offStart && localDate <= offEnd;
    });
    if (isOff) continue;

    const dur = schedule.slotDurationMinutes;
    const dayStart = localWallClockToInstant(localDate, schedule.startTime, args.timezone);
    const dayEnd = localWallClockToInstant(localDate, schedule.endTime, args.timezone);

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
