// Aiva — tenant-scoped doctor schedule + time-off reads/writes.
//
// These feed computeAvailability (lib/appointments/queries.ts), which is what
// the booking modal AND the voice agent use to find bookable slots. Without a
// schedule row a doctor has zero availability.
//
// Tenant safety: DoctorSchedule/DoctorTimeOff have no clinicId of their own, so
// every entry point first verifies the doctor belongs to the caller's clinic
// via getDoctor(staff, doctorId) before touching child rows.

import "server-only";
import type { ClinicStaff, DoctorSchedule, DoctorTimeOff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDoctor } from "@/lib/doctors/queries";
import type {
  PutScheduleInput,
  CreateTimeOffInput,
} from "@/lib/validations/schedule";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

// Parse a "YYYY-MM-DD" calendar date into the midnight-UTC instant the @db.Date
// column stores. computeAvailability reads these back with toLocalDate(), which
// compares by YYYY-MM-DD, so midnight-UTC keeps the calendar date stable with
// no timezone roll. Never build these from `new Date()` with a local time.
function calendarDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

export async function getDoctorSchedule(
  staff: ScopedStaff,
  doctorId: string,
): Promise<DoctorSchedule[] | null> {
  const doctor = await getDoctor(staff, doctorId);
  if (!doctor) return null;
  return prisma.doctorSchedule.findMany({
    where: { doctorId },
    orderBy: { dayOfWeek: "asc" },
  });
}

// Replace the doctor's ENTIRE weekly grid atomically. Delete-then-createMany
// sidesteps the @@unique([doctorId, dayOfWeek]) upsert headache: there is no
// per-row diff, and $transaction makes it atomic. Returns null if the doctor
// isn't in the caller's clinic.
export async function replaceDoctorSchedule(
  staff: ScopedStaff,
  doctorId: string,
  input: PutScheduleInput,
): Promise<DoctorSchedule[] | null> {
  const doctor = await getDoctor(staff, doctorId);
  if (!doctor) return null;

  await prisma.$transaction([
    prisma.doctorSchedule.deleteMany({ where: { doctorId } }),
    prisma.doctorSchedule.createMany({
      data: input.days.map((d) => ({
        doctorId,
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slotDurationMinutes: d.slotDurationMinutes,
      })),
    }),
  ]);

  return prisma.doctorSchedule.findMany({
    where: { doctorId },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function listTimeOff(
  staff: ScopedStaff,
  doctorId: string,
): Promise<DoctorTimeOff[] | null> {
  const doctor = await getDoctor(staff, doctorId);
  if (!doctor) return null;
  return prisma.doctorTimeOff.findMany({
    where: { doctorId },
    orderBy: { startDate: "asc" },
  });
}

export async function createTimeOff(
  staff: ScopedStaff,
  doctorId: string,
  input: CreateTimeOffInput,
): Promise<DoctorTimeOff | null> {
  const doctor = await getDoctor(staff, doctorId);
  if (!doctor) return null;
  return prisma.doctorTimeOff.create({
    data: {
      doctorId,
      startDate: calendarDate(input.startDate),
      endDate: calendarDate(input.endDate),
      reason: input.reason,
    },
  });
}

export async function deleteTimeOff(
  staff: ScopedStaff,
  doctorId: string,
  timeOffId: string,
): Promise<boolean> {
  const doctor = await getDoctor(staff, doctorId);
  if (!doctor) return false;
  const result = await prisma.doctorTimeOff.deleteMany({
    where: { id: timeOffId, doctorId },
  });
  return result.count > 0;
}
