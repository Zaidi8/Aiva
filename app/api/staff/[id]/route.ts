// Aiva — clinic staff item endpoint. Admin-only.
//
// PATCH  /api/staff/[id] → change role
// DELETE /api/staff/[id] → deactivate (soft delete)
//
// Guards (returned as 409): cannot demote/deactivate the last Admin, and cannot
// change/deactivate your own membership (lockout prevention).

import type { NextRequest } from "next/server";
import { withApiRole } from "@/lib/api/with-staff";
import {
  ok,
  noContent,
  failNotFound,
  failConflict,
  failValidation,
} from "@/lib/api/response";
import { updateStaffRole, deactivateStaff } from "@/lib/staff/mutations";
import { updateStaffRoleSchema } from "@/lib/validations/staff";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

const CONFLICT_MESSAGES: Record<string, string> = {
  last_admin: "This is the clinic's only admin — promote someone else first.",
  self: "You can't change your own membership here.",
};

export const PATCH = withApiRole<Ctx>(["Admin"])(
  async (req: NextRequest, { params }, staff) => {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateStaffRoleSchema.safeParse(body);
    if (!parsed.success) return failValidation(parsed.error);

    const result = await updateStaffRole(staff, id, parsed.data.role);
    if (!result.ok) {
      if (result.reason === "not_found") return failNotFound("Team member");
      return failConflict(CONFLICT_MESSAGES[result.reason]);
    }
    return ok({ id, role: parsed.data.role });
  },
);

export const DELETE = withApiRole<Ctx>(["Admin"])(
  async (_req, { params }, staff) => {
    const { id } = await params;
    const result = await deactivateStaff(staff, id);
    if (!result.ok) {
      if (result.reason === "not_found") return failNotFound("Team member");
      return failConflict(CONFLICT_MESSAGES[result.reason]);
    }
    return noContent();
  },
);
