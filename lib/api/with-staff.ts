// Aiva — Route-handler auth wrappers.
//
// The Edge proxy at proxy.ts deliberately excludes /api/* from session
// gating, so every Route Handler must enforce its own auth. These wrappers
// adapt the existing `requireApiStaff` / `requireApiRole` from lib/auth.ts
// (which return `StaffWithClinic | Response`) into a "handler receives staff"
// shape so each route file stays free of auth boilerplate.
//
// Usage:
//
//   export const GET = withApiStaff(async (req, _ctx, staff) => {
//     // staff is non-null, scoped to its clinic.
//     return ok(await listPatients(staff));
//   });
//
//   export const DELETE = withApiRole(['Admin'])(async (req, ctx, staff) => {
//     ...
//   });

import type { NextRequest } from "next/server";
import type { StaffRole } from "@prisma/client";
import {
  requireApiStaff,
  requireApiRole,
  type StaffWithClinic,
} from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";

type Handler<Ctx> = (
  req: NextRequest,
  ctx: Ctx,
  staff: StaffWithClinic,
) => Promise<Response>;

export function withApiStaff<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const result = await requireApiStaff(req);
    if (result instanceof Response) return result;
    return handler(req, ctx, result);
  };
}

export function withApiRole<Ctx = unknown>(roles: StaffRole[]) {
  return (handler: Handler<Ctx>) =>
    async (req: NextRequest, ctx: Ctx): Promise<Response> => {
      const result = await requireApiRole(req, roles);
      if (result instanceof Response) return result;
      return handler(req, ctx, result);
    };
}

// Permission-based variant: 401 if no session, 403 if the staff's role holds
// none of the required permissions. Keep the matrix in lib/rbac.ts in sync
// with the role arrays used in withApiRole.
export function withApiCan<Ctx = unknown>(permissions: Permission[]) {
  return (handler: Handler<Ctx>) =>
    async (req: NextRequest, ctx: Ctx): Promise<Response> => {
      const result = await requireApiStaff(req);
      if (result instanceof Response) return result;
      if (!can(result.role, permissions)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      return handler(req, ctx, result);
    };
}
