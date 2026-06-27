// Aiva — current-user profile endpoint.
//
// PATCH /api/me → update the caller's OWN ClinicStaff profile (name/phone/
// jobTitle). Email and role are intentionally NOT editable here.

import type { NextRequest } from "next/server";
import { withApiStaff } from "@/lib/api/with-staff";
import { ok, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { updateMe } from "@/lib/staff/mutations";
import { updateMeSchema } from "@/lib/validations/staff";

export const runtime = "nodejs";

export const PATCH = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const body = await req.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const updated = await updateMe(staff, parsed.data);
    return ok(updated);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
