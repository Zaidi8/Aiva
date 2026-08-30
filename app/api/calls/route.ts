// Aiva — calls list endpoint backing the AI Receptionist page.
//
// GET /api/calls
//   ?from=<ISO>           inclusive lower bound on startedAt
//   ?to=<ISO>              inclusive upper bound on startedAt
//   ?take=<int> (default 50)
//   ?skip=<int> (default 0)
//
// The underlying helper (lib/calls/queries.ts) already scopes by clinic.
// Note: search/q is intentionally NOT supported yet — the audit only needs
// list + detail, and CallLog has no name column (patientPhone + linked patient.fullName).
// If/when search becomes needed, extend listCalls to OR over those two.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import { ok } from "@/lib/api/response";
import { listCalls } from "@/lib/calls/queries";

export const runtime = "nodejs";

export const GET = withApiCan(["call:read"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const takeRaw = url.searchParams.get("take");
  const skipRaw = url.searchParams.get("skip");
  const take = takeRaw ? Number(takeRaw) : 50;
  const skip = skipRaw ? Number(skipRaw) : 0;

  const result = await listCalls(staff, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    take: Number.isFinite(take) ? take : 50,
    skip: Number.isFinite(skip) ? skip : 0,
  });
  return ok(result);
});
