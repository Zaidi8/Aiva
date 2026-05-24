// Aiva — dashboard tiles endpoint.
//
// GET /api/dashboard-summary → 200 { data: DashboardSummary }
//
// One round-trip, six parallel counts. See lib/dashboard/queries.ts.

import type { NextRequest } from "next/server";

import { withApiStaff } from "@/lib/api/with-staff";
import { ok } from "@/lib/api/response";
import { getDashboardSummary } from "@/lib/dashboard/queries";

export const runtime = "nodejs";

export const GET = withApiStaff(async (_req: NextRequest, _ctx, staff) => {
  const summary = await getDashboardSummary(staff);
  return ok(summary);
});
