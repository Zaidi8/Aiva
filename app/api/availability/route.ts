// GET /api/availability?doctorId=...&from=...&to=...
// Returns the bookable slot windows for a doctor inside the [from, to] range.
// Empty array = doctor has no schedule, is deactivated, or every slot is taken.

import type { NextRequest } from "next/server";
import { withApiCan } from "@/lib/api/with-staff";
import { ok, failValidation } from "@/lib/api/response";
import { computeAvailability } from "@/lib/appointments/queries";
import { availabilityQuerySchema } from "@/lib/validations/appointment";

export const runtime = "nodejs";

export const GET = withApiCan(["appointment:read"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const url = new URL(req.url);
  const parsed = availabilityQuerySchema.safeParse({
    doctorId: url.searchParams.get("doctorId"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) return failValidation(parsed.error);
  const slots = await computeAvailability(staff, {
    doctorId: parsed.data.doctorId,
    from: new Date(parsed.data.from),
    to: new Date(parsed.data.to),
    timezone: staff.clinic.timezone,
  });
  return ok({ slots });
});
