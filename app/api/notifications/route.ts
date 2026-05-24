// Aiva — notifications endpoint backing the TopBar bell.
//
// GET /api/notifications
//   ?take=<int> (default 20)
//   ?skip=<int> (default 0)
//   ?status=Pending&status=Failed   (repeatable; filter by row status)
//
// Returns { items, total, unread } so the bell can show the badge count
// and the dropdown can render the latest few.

import type { NextRequest } from "next/server";
import type { NotificationStatus } from "@prisma/client";

import { withApiStaff } from "@/lib/api/with-staff";
import { ok } from "@/lib/api/response";
import { listNotifications } from "@/lib/notifications/queries";

export const runtime = "nodejs";

export const GET = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const url = new URL(req.url);
  const takeRaw = url.searchParams.get("take");
  const skipRaw = url.searchParams.get("skip");
  const status = url.searchParams.getAll("status") as NotificationStatus[];

  const take = takeRaw ? Number(takeRaw) : 20;
  const skip = skipRaw ? Number(skipRaw) : 0;

  const result = await listNotifications(staff, {
    take: Number.isFinite(take) ? take : 20,
    skip: Number.isFinite(skip) ? skip : 0,
    status: status.length ? status : undefined,
  });
  return ok(result);
});
