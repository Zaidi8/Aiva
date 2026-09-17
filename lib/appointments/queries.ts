// Aiva — tenant-scoped appointment reads + slot-availability computation.

import "server-only";
import type {
  Appointment,
  AppointmentStatus,
  ClinicStaff,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { normalizePhone } from "@/lib/voice/phone";
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
// Patient-level time-conflict detection (Phase 11)
//
// The DB's @@unique([doctorId, scheduledAt]) guard stops the SAME doctor being
// double-booked at one instant, but it says nothing about one patient holding
// two appointments at the same time with DIFFERENT doctors. This helper finds
// non-cancelled appointments belonging to a phone number that OVERLAP a
// candidate instant window [from, to) (cross-doctor only, optionally excluding
// one appointment id — used by reschedule so the appointment being MOVED doesn't
// count as a conflict with itself).
//
// Overlap definition: an existing appointment occupies [scheduledAt,
// scheduledAt + durationMin). Two intervals overlap when each starts strictly
// before the other ends. A wider fetch window (±1 day) is filtered precisely in
// JS so we never rely on SQL date arithmetic.
// ────────────────────────────────────────────────────────────────────────────

export interface PatientConflict {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: Date;
  durationMin: number;
  status: string;
}

async function findPatientTimeConflictsForIds(
  staff: Pick<ClinicStaff, "clinicId">,
  args: {
    patientIds: string[];
    from: Date; // candidate slot start (true instant)
    to: Date; // candidate slot end (true instant)
    excludeAppointmentId?: string;
  },
): Promise<PatientConflict[]> {
  if (args.patientIds.length === 0) return [];

  const paddingDay = 24 * 60 * 60 * 1000;
  const candidates = await prisma.appointment.findMany({
    where: {
      ...clinicWhere(staff),
      patientId: { in: args.patientIds },
      status: { in: ["Pending", "Confirmed"] },
      scheduledAt: {
        gte: new Date(args.from.getTime() - paddingDay),
        lt: new Date(args.to.getTime() + paddingDay),
      },
    },
    select: {
      id: true,
      patientId: true,
      scheduledAt: true,
      durationMin: true,
      status: true,
      doctorId: true,
      doctor: { select: { name: true } },
    },
  });

  const conflicts: PatientConflict[] = [];
  for (const a of candidates) {
    if (args.excludeAppointmentId && a.id === args.excludeAppointmentId) continue;
    const existingEnd = a.scheduledAt.getTime() + a.durationMin * 60 * 1000;
    const overlaps =
      a.scheduledAt.getTime() < args.to.getTime() && existingEnd > args.from.getTime();
    if (!overlaps) continue;
    conflicts.push({
      appointmentId: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      doctorName: a.doctor.name,
      scheduledAt: a.scheduledAt,
      durationMin: a.durationMin,
      status: a.status,
    });
  }
  // Oldest-first for a stable spoken order.
  return conflicts.sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime());
}

export async function findPatientTimeConflicts(
  staff: Pick<ClinicStaff, "clinicId">,
  args: {
    phone: string;
    from: Date; // candidate slot start (true instant)
    to: Date; // candidate slot end (true instant)
    excludeAppointmentId?: string;
  },
): Promise<PatientConflict[]> {
  const patients = await prisma.patient.findMany({
    // Phone numbers are stored normalized; normalize the lookup input too so a
    // caller's "as-typed" number matches their existing patient record.
    where: { clinicId: staff.clinicId, phoneNumber: normalizePhone(args.phone) },
    select: { id: true },
  });
  return findPatientTimeConflictsForIds(staff, {
    patientIds: patients.map((p) => p.id),
    from: args.from,
    to: args.to,
    excludeAppointmentId: args.excludeAppointmentId,
  });
}

export async function findPatientTimeConflictsByIds(
  staff: Pick<ClinicStaff, "clinicId">,
  args: {
    patientIds: string[];
    from: Date; // candidate slot start (true instant)
    to: Date; // candidate slot end (true instant)
    doctorId: string; // the doctor being booked — a conflict only exists cross-doctor
    excludeAppointmentId?: string;
  },
): Promise<PatientConflict[]> {
  const conflicts = await findPatientTimeConflictsForIds(staff, {
    patientIds: args.patientIds,
    from: args.from,
    to: args.to,
    excludeAppointmentId: args.excludeAppointmentId,
  });
  // Booking/rescheduling with the SAME doctor is handled by the per-doctor
  // unique constraint; only same-time appointments under a DIFFERENT doctor are
  // a patient-level conflict.
  return conflicts.filter((c) => c.doctorId !== args.doctorId);
}

// Phase 11b — override guard. A caller may only book/reschedule onto a slot that
// overlaps another of their appointments under a DIFFERENT doctor if they were
// first WARNED and then said yes. A bare `confirm: true` from the LLM is NOT
// enough: a model can set it before the warning was ever spoken, which produced a
// real silent double-booking. So the agent must ALSO echo back the
// `appointmentId`s it was shown. Those ids only exist in a conflict response —
// echoing the CURRENT ones proves the warning was actually disclosed — and
// requiring all of them to match rejects a stale or invented ack.
export function conflictsAcknowledged(
  conflicts: PatientConflict[],
  ackIds: readonly string[] | undefined,
): boolean {
  if (conflicts.length === 0) return true;
  if (!ackIds || ackIds.length === 0) return false;
  const acked = new Set(ackIds);
  return conflicts.every((c) => acked.has(c.appointmentId));
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
  //
  // The loop must run one UTC day PAST the window: for a negative-offset
  // timezone (e.g. America/New_York, UTC-4) the window's last local day begins
  // on the following UTC day, and ending the loop at `args.to` silently drops
  // every slot in it.
  const slots: AvailableSlot[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const seenLocalDates = new Set<string>();
  const lastUtcDay = startOfDayUTC(args.to);
  for (
    let d = startOfDayUTC(args.from);
    d <= new Date(lastUtcDay.getTime() + dayMs);
    d = new Date(d.getTime() + dayMs)
  ) {
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
