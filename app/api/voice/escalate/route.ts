// POST /api/voice/escalate
//
// Called by the Python agent the moment it hands a live call to a human: the
// caller asked for a person, two booking/availability tools failed back to
// back, a write exhausted its retries and got parked, or the model judged it an
// emergency. It records the escalation on the CallLog so the call is flagged on
// the AI Receptionist page and a staff member can join that exact LiveKit room
// while the caller is still on the line.
//
// The nearest existing precedent is POST /api/voice/failed-booking — a write
// that couldn't complete gets parked for human follow-up. This is the same
// "never let the call vanish" idea applied to a handoff, with the extra
// affordance that a person can now actually pick it up.
//
// {
//   "eventId":       "<call-id>.escalate.<reason>",   // idempotency
//   "providerCallId": "<call-id>",
//   "clinicId":      "<clinic-id>",
//   "reason":        "CallerRequested" | "ToolFailureStreak" | "FailedBooking" | "Emergency",
//   "detail":        "caller asked for a person",     // optional, ≤500 chars
//   "roomName":      "<livekit-room>",
//   "at":            "<ISO>"                          // optional
// }
//
// Idempotent via WebhookEvent: the agent latches its own per-call config and
// escalates at most once, but a retried request must not create a second
// escalation (Escalation.callLogId is unique anyway — this just avoids the work).
//
// No token is minted here. The agent never receives staff credentials; staff get
// their own token from POST /api/calls/[id]/join behind session auth.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation, failNotFound } from "@/lib/api/response";
import { withIdempotency } from "@/lib/voice/webhook-idempotency";
import {
  markEscalated,
  type MarkEscalatedResult,
} from "@/lib/calls/escalations";
import { getAiSettings } from "@/lib/ai-settings/queries";
import { voiceEscalateBodySchema } from "@/lib/validations/escalation";

export const runtime = "nodejs";

export const POST = withWebhookSecret(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = voiceEscalateBodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const { eventId, providerCallId, clinicId, reason, detail, roomName, at } =
    parsed.data;

  // Out-param holder: the side effect runs inside the idempotency closure, so
  // its result has to escape through a mutable box. An object (not a bare
  // `let`) so control-flow narrowing can't conclude the box is still empty by
  // the time we read it.
  const out: { escalation?: MarkEscalatedResult } = {};

  const verdict = await withIdempotency(
    {
      provider: "voice",
      providerEventId: eventId,
      eventType: "call.escalated",
      payload: parsed.data,
    },
    async () => {
      // Master switch (AiSettings.escalateToHuman). Checked BEFORE any write so
      // a clinic that has turned escalation off never gets flagged calls. The
      // agent is also not given the tool in that case; this is the belt to
      // agent.py's braces.
      const settings = await getAiSettings({ clinicId });
      if (settings && settings.escalateToHuman === false) return;

      out.escalation = await markEscalated({
        clinicId,
        providerCallId,
        reason,
        detail,
        roomName,
        at: at ? new Date(at) : undefined,
      });
    },
  );

  if (verdict.status === "failed") {
    if (verdict.error === "Unknown providerCallId") return failNotFound("Call");
    if (verdict.error === "Clinic mismatch") {
      return fail("CLINIC_MISMATCH", "Call does not belong to this clinic.", 409);
    }
    return fail("WEBHOOK_FAILED", verdict.error, 500);
  }

  // Side effect deliberately skipped: escalation is switched off for this
  // clinic. 200 so the agent's fail-soft path doesn't retry a decision that
  // will not change.
  const result = out.escalation;
  if (!result) return ok({ escalated: false, reason: "disabled" });

  const { escalation, alreadyEscalated } = result;
  return ok({
    escalated: true,
    alreadyEscalated,
    escalationId: escalation.id,
    status: escalation.status,
    reason: escalation.reason,
    roomName: escalation.roomName,
    // The agent has already handed off by the time it sees this, so the flag is
    // informational — but it tells the caller-facing code whether the call is
    // actually joinable (no roomName = staff can't take it).
    joinable: Boolean(escalation.roomName),
  });
});
