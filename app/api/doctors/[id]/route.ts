// Aiva — doctors item endpoint.
//
// DELETE is a SOFT delete (set deactivatedAt) because Appointment.doctorId has
// onDelete: Restrict. To revive a doctor, PATCH with {} after a re-activate
// helper, or call POST /api/doctors/[id]/reactivate (future).

import type { NextRequest } from "next/server";
import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  noContent,
  failNotFound,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { getDoctor } from "@/lib/doctors/queries";
import { updateDoctor, deactivateDoctor } from "@/lib/doctors/mutations";
import { updateDoctorSchema } from "@/lib/validations/doctor";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const GET = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const doctor = await getDoctor(staff, id);
  if (!doctor) return failNotFound("Doctor");
  return ok(doctor);
});

export const PATCH = withApiStaff<Ctx>(async (req, { params }, staff) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateDoctorSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const doctor = await updateDoctor(staff, id, parsed.data);
    if (!doctor) return failNotFound("Doctor");
    return ok(doctor);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});

export const DELETE = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const found = await deactivateDoctor(staff, id);
  if (!found) return failNotFound("Doctor");
  return noContent();
});
