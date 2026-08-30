// Aiva — analytics endpoint backing the Analytics page.
//
// GET /api/analytics?range=this-month|this-week|last-30d|this-year (default this-month)
// → 200 { data: AnalyticsPayload }
//
// All counts are clinic-scoped via clinicWhere; see lib/analytics/queries.ts.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import { ok } from "@/lib/api/response";
import {
  getAnalytics,
  type AnalyticsRange,
} from "@/lib/analytics/queries";

export const runtime = "nodejs";

const VALID_RANGES: AnalyticsRange[] = [
  "this-week",
  "this-month",
  "last-30d",
  "this-year",
];

export const GET = withApiCan(["analytics:read"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const url = new URL(req.url);
  const rawRange = url.searchParams.get("range");
  const range: AnalyticsRange =
    rawRange && (VALID_RANGES as string[]).includes(rawRange)
      ? (rawRange as AnalyticsRange)
      : "this-month";
  const payload = await getAnalytics(staff, range);
  return ok(payload);
});
