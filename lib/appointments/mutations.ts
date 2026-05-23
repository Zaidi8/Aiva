// Aiva — tenant-scoped appointment writes.
//
// DB-level double-booking prevention via `@@unique([doctorId, scheduledAt])`
// surfaces as Prisma P2002 — the API layer's mapPrismaError translates that
// to HTTP 409. Race-safe and atomic.

import "server-only";
import type { Appointment, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/lib/validations/appointment";

export async function createAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  // Verify patient + doctor both belong to the calling clinic before insert.
  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: input.patientId, ...clinicWhere(staff) },
      select: { id: true },
    }),
    prisma.doctor.findFirst({
      where: { id: input.doctorId, ...clinicWhere(staff), deactivatedAt: null },
      select: { id: true },
    }),
  ]);
  if (!patient) {
    throw new AppointmentFkError("patientId", "Patient not found in this clinic.");
  }
  if (!doctor) {
    throw new AppointmentFkError(
      "doctorId",
      "Doctor not found or deactivated in this clinic.",
    );
  }

  return prisma.appointment.create({
    data: {
      patientId: input.patientId,
      doctorId: input.doctorId,
      scheduledAt: new Date(input.scheduledAt),
      durationMin: input.durationMin,
      type: input.type,
      status: input.status ?? "Pending",
      notes: input.notes,
      clinicId: staff.clinicId,
    },
  });
}

export async function updateAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
  input: UpdateAppointmentInput,
): Promise<Appointment | null> {
  const result = await prisma.appointment.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: input,
  });
  if (result.count === 0) return null;
  return prisma.appointment.findUniqueOrThrow({ where: { id } });
}

export async function rescheduleAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
  input: RescheduleAppointmentInput,
): Promise<Appointment | null> {
  // updateMany would silently no-op cross-tenant; we need findFirst first so
  // the unique constraint check happens on the right tenant.
  const existing = await prisma.appointment.findFirst({
    where: { id, ...clinicWhere(staff) },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.appointment.update({
    where: { id: existing.id },
    data: {
      scheduledAt: new Date(input.scheduledAt),
      ...(input.durationMin ? { durationMin: input.durationMin } : {}),
    },
  });
}

export async function cancelAppointment(
  staff: Pick<ClinicStaff, "clinicId">,
  id: string,
): Promise<boolean> {
  const result = await prisma.appointment.updateMany({
    where: { id, ...clinicWhere(staff), status: { not: "Cancelled" } },
    data: { status: "Cancelled" },
  });
  return result.count > 0;
}

// Thrown by createAppointment when the patientId/doctorId belong to another
// clinic. The api-engineer layer turns this into a 422 with field hint.
export class AppointmentFkError extends Error {
  constructor(
    public field: "patientId" | "doctorId",
    message: string,
  ) {
    super(message);
    this.name = "AppointmentFkError";
  }
}
