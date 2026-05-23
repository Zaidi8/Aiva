// Aiva — appointment item endpoint. DELETE cancels (does not hard-delete).

import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  noContent,
  failNotFound,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { getAppointment } from "@/lib/appointments/queries";
import {
  updateAppointment,
  cancelAppointment,
} from "@/lib/appointments/mutations";
import { updateAppointmentSchema } from "@/lib/validations/appointment";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const GET = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const appt = await getAppointment(staff, id);
  if (!appt) return failNotFound("Appointment");
  return ok(appt);
});

export const PATCH = withApiStaff<Ctx>(async (req, { params }, staff) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const appt = await updateAppointment(staff, id, parsed.data);
    if (!appt) return failNotFound("Appointment");
    return ok(appt);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});

// DELETE = cancel (sets status: Cancelled). Hard-delete is unsafe because
// CallLog FK has onDelete: SetNull but we still want history.
export const DELETE = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const found = await cancelAppointment(staff, id);
  if (!found) return failNotFound("Appointment");
  return noContent();
});
