// Aiva — tenant-scoped appointment writes.
//
// DB-level double-booking prevention via `@@unique([doctorId, scheduledAt])`
// surfaces as Prisma P2002 — the API layer's mapPrismaError translates that
// to HTTP 409. Race-safe and atomic.

import "server-only";
import type { Appointment, AppointmentType, ClinicStaff } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { normalizePhone } from "@/lib/voice/phone";
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

// ────────────────────────────────────────────────────────────────────────────
// Voice booking (Phase 4)
//
// The voice agent books on behalf of a phone caller. The endpoint has already
// resolved + validated the doctor and the slot instant; this helper does the
// write: find-or-create the patient by phone, then create the appointment.
//
// All queries are SEQUENTIAL — the voice DB pool runs connection_limit=1
// (pgbouncer); concurrent Prisma queries contend on the single connection and
// intermittently fail. Do NOT Promise.all here.
//
// Idempotency / double-book safety leans entirely on the DB constraint
// @@unique([doctorId, scheduledAt]): a duplicate write throws P2002. We catch it
// and look up the existing appointment — if it belongs to THIS caller we treat
// the booking as already done (idempotent success); otherwise the slot was taken
// by someone else (SlotTakenError).
// ────────────────────────────────────────────────────────────────────────────

export interface VoiceBookInput {
  doctorId: string;
  scheduledAt: Date; // true instant
  durationMin: number;
  type: AppointmentType;
  phone: string;
  patientName?: string; // used only when creating a new patient
}

export interface VoiceBookResult {
  appointment: Appointment & {
    patient: { id: string; fullName: string };
    doctor: { id: string; name: string };
  };
  idempotent: boolean; // true if this slot was already booked by this caller
}

export class SlotTakenError extends Error {
  constructor(message = "That time was just taken.") {
    super(message);
    this.name = "SlotTakenError";
  }
}

export async function bookAppointmentForVoice(
  staff: Pick<ClinicStaff, "clinicId">,
  input: VoiceBookInput,
): Promise<VoiceBookResult> {
  // Canonicalize the phone so the same caller maps to one patient record
  // regardless of how the number was spoken/typed (see lib/voice/phone.ts).
  const phone = normalizePhone(input.phone);

  // 1. Find an existing patient in this clinic by phone (most-recent first so a
  // repeat caller reuses their record). Create one only if none exists.
  let patient = await prisma.patient.findFirst({
    where: { clinicId: staff.clinicId, phoneNumber: phone },
    orderBy: { createdAt: "desc" },
    select: { id: true, fullName: true },
  });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        clinicId: staff.clinicId,
        fullName: input.patientName?.trim() || "Phone caller",
        phoneNumber: phone,
      },
      select: { id: true, fullName: true },
    });
  }

  // 2. Create the appointment. The unique (doctorId, scheduledAt) guard makes
  // this race-safe; a duplicate throws P2002, handled below.
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: input.doctorId,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        type: input.type,
        status: "Confirmed",
        clinicId: staff.clinicId,
      },
      include: {
        patient: { select: { id: true, fullName: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    return { appointment, idempotent: false };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Slot already booked. Look up who holds it. (clinicWhere here is the safe
      // direction: the @@unique constraint is (doctorId, scheduledAt) WITHOUT
      // clinicId — fine because a doctor belongs to one clinic — but we still
      // scope the lookup, so a hypothetical cross-clinic row reads as null and
      // we fail closed via SlotTakenError. Don't "fix" the scoping away.)
      const existing = await prisma.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          scheduledAt: input.scheduledAt,
          ...clinicWhere(staff),
        },
        include: {
          patient: { select: { id: true, fullName: true, phoneNumber: true } },
          doctor: { select: { id: true, name: true } },
        },
      });
      // Same caller (a retry / re-ask) → idempotent success. Compare by PHONE,
      // not patient id: phoneNumber is non-unique, so a same-phone duplicate
      // patient row would otherwise make a caller's own re-book look "taken".
      if (existing && existing.patient.phoneNumber === phone) {
        return { appointment: existing, idempotent: true };
      }
      throw new SlotTakenError();
    }
    throw e;
  }
}
