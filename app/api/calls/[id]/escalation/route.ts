// Aiva — staff transitions on a live escalation.
//
// POST /api/calls/:id/escalation
//   { "action": "claim"  } → staff joined the room; records WHO took the call.
//   { "action": "resolve" } → closed out; the call no longer shows as pending.
//
// `claim` is idempotent for the same staff member (re-joining, a double-click,
// a page refresh mid-call) and 409s when a DIFFERENT colleague already claimed
// it, so two people don't quietly talk over each other on the same caller.
//
// Requires `call:read` — the same permission as the AI Receptionist page, i.e.
// Admin + Receptionist, not Doctor. Every lookup is tenant-scoped, so a staff
// member can only ever act on their own clinic's calls.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import {
  ok,
  failValidation,
  failNotFound,
  failConflict,
} from "@/lib/api/response";
import {
  EscalationAlreadyClaimedError,
  claimEscalation,
  resolveEscalation,
} from "@/lib/calls/escalations";
import { callEscalationActionSchema } from "@/lib/validations/escalation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiCan<Ctx>(["call:read"])(async (
  req: NextRequest,
  ctx,
  staff,
) => {
  const body = await req.json().catch(() => null);
  const parsed = callEscalationActionSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const { id } = await ctx.params;

  try {
    const escalation =
      parsed.data.action === "claim"
        ? await claimEscalation(staff, id)
        : await resolveEscalation(staff, id);
    return ok({ action: parsed.data.action, escalation });
  } catch (e) {
    if (e instanceof EscalationAlreadyClaimedError) {
      // e.message distinguishes "a colleague is on it" from "staff already
      // marked this handled" — both are 409, but the receptionist needs to know
      // which one happened.
      return failConflict(e.message);
    }
    if (e instanceof Error && e.message === "Unknown escalation") {
      return failNotFound("Escalation");
    }
    throw e;
  }
});
