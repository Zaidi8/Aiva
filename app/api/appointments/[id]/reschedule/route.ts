// POST /api/appointments/[id]/reschedule  → re-checks the slot-uniqueness
// constraint via the DB. P2002 → 409 SLOT_TAKEN.

import { withApiCan } from "@/lib/api/with-staff";
import {
  ok,
  failNotFound,
  failValidation,
  fail,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { rescheduleAppointment } from "@/lib/appointments/mutations";
import { PatientConflictError } from "@/lib/appointments/mutations";
import { rescheduleAppointmentSchema } from "@/lib/validations/appointment";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const POST = withApiCan<Ctx>(["appointment:write"])(async (
  req,
  { params },
  staff,
) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = rescheduleAppointmentSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const appt = await rescheduleAppointment(staff, id, parsed.data);
    if (!appt) return failNotFound("Appointment");
    return ok(appt);
  } catch (e) {
    if (e instanceof PatientConflictError) {
      return fail(
        "PATIENT_CONFLICT",
        e.message,
        409,
        {
          conflicts: e.conflicts.map(
            (c) => `${c.doctorName} on ${c.date} at ${c.time}`,
          ),
        },
      );
    }
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
