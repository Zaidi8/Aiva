// Aiva — single call detail endpoint.
//
// GET /api/calls/:id → 200 { data: CallLog } | 404
//
// Tenant-scoped via getCall (uses findFirst + clinicWhere). Cross-tenant or
// unknown id returns 404 — never 403, to avoid leaking the existence of
// other clinics' call records.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import { ok, failNotFound } from "@/lib/api/response";
import { getCall } from "@/lib/calls/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiCan<Ctx>(["call:read"])(async (
  _req: NextRequest,
  ctx,
  staff,
) => {
  const { id } = await ctx.params;
  const call = await getCall(staff, id);
  if (!call) return failNotFound("Call");
  return ok(call);
});
