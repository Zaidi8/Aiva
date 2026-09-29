// Aiva — mint a LiveKit join token so a staff member can take a live escalated call.
//
// POST /api/calls/:id/join → 200 { data: { token, url, roomName, identity } }
//
// There is no SIP trunk yet, so escalation means "a colleague joins the same
// LiveKit room from their browser". The agent unpublishes its own audio track
// the moment it sees a staff participant arrive, and the caller is talking
// directly to a person. When a trunk is added, only this step's mechanism
// changes (WarmTransferTask dials a phone instead) — nothing else moves.
//
// Requires `call:read` — the same permission that gates the AI Receptionist
// page itself, i.e. Admin + Receptionist, not Doctor. The room name is read from
// the tenant-scoped Escalation row, never from the request, so a staff member
// can only ever mint a token for a call belonging to their own clinic.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import { ok, fail, failNotFound } from "@/lib/api/response";
import { getCall } from "@/lib/calls/queries";
import { getEscalation } from "@/lib/calls/escalations";
import { createStaffJoinToken } from "@/lib/voice/livekit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiCan<Ctx>(["call:read"])(async (
  _req: NextRequest,
  ctx,
  staff,
) => {
  const { id } = await ctx.params;
  const call = await getCall(staff, id);
  if (!call) return failNotFound("Call");

  const escalation = await getEscalation(staff, id);
  if (!escalation) {
    return fail(
      "NOT_ESCALATED",
      "This call was not escalated — there is no live room to join.",
      409,
    );
  }
  if (!escalation.roomName) {
    return fail(
      "NO_ROOM",
      "This escalation has no LiveKit room recorded, so the call cannot be joined.",
      409,
    );
  }

  const credentials = await createStaffJoinToken({
    staffId: staff.id,
    staffName: staff.fullName,
    roomName: escalation.roomName,
  });
  if (!credentials) {
    return fail(
      "LIVEKIT_NOT_CONFIGURED",
      "LiveKit is not configured on this server (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET).",
      503,
    );
  }

  return ok(credentials);
});
