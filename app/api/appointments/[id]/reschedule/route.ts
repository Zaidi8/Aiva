// POST /api/appointments/[id]/reschedule  → re-checks the slot-uniqueness
// constraint via the DB. P2002 → 409 SLOT_TAKEN.

import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  failNotFound,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { rescheduleAppointment } from "@/lib/appointments/mutations";
import { rescheduleAppointmentSchema } from "@/lib/validations/appointment";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const POST = withApiStaff<Ctx>(async (req, { params }, staff) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = rescheduleAppointmentSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const appt = await rescheduleAppointment(staff, id, parsed.data);
    if (!appt) return failNotFound("Appointment");
    return ok(appt);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
