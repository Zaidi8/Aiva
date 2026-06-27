// Aiva — clinic staff (team) collection endpoint. Admin-only.
//
// GET  /api/staff → { items: StaffListItem[] }
// POST /api/staff → create a dashboard login; returns { staff, tempPassword }
//                   (the temp password is shown ONCE).

import type { NextRequest } from "next/server";
import { withApiRole } from "@/lib/api/with-staff";
import { ok, created, failValidation, failConflict } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listStaff } from "@/lib/staff/queries";
import { createStaffUser, StaffProvisionError } from "@/lib/staff/mutations";
import { createStaffSchema } from "@/lib/validations/staff";

export const runtime = "nodejs";

export const GET = withApiRole(["Admin"])(async (_req, _ctx, staff) => {
  const items = await listStaff(staff);
  return ok({ items });
});

export const POST = withApiRole(["Admin"])(
  async (req: NextRequest, _ctx, staff) => {
    const body = await req.json().catch(() => null);
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) return failValidation(parsed.error);
    try {
      const result = await createStaffUser(staff, parsed.data);
      return created(result);
    } catch (e) {
      if (e instanceof StaffProvisionError) {
        return failConflict(e.message);
      }
      const mapped = mapPrismaError(e);
      if (mapped) return mapped;
      throw e;
    }
  },
);
