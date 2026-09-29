// Aiva — human-escalation payload schemas.
//
// Two audiences:
//   • the voice agent, which records an escalation on a live call
//     (POST /api/voice/escalate, guarded by x-webhook-secret)
//   • clinic staff claiming / resolving one from the AI Receptionist page
//     (POST /api/calls/[id]/escalation)
//
// `voiceEscalateBodySchema` follows the lifecycle-webhook conventions: a
// caller-supplied `eventId` for WebhookEvent idempotency, `providerCallId` to
// bind the escalation to the CallLog, and the LiveKit `roomName` staff will
// later join. `clinicId` is the worker's own (AIVA_CLINIC_ID) — the agent
// already knows its tenant, same as the other voice write endpoints.

import { z } from "zod";

// Mirrors the Prisma EscalationReason enum.
export const escalationReasonSchema = z.enum([
  "CallerRequested",
  "ToolFailureStreak",
  "FailedBooking",
  "Emergency",
]);

export const voiceEscalateBodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  // Idempotency anchor. The agent sends f"{providerCallId}.escalate.{reason}";
  // a retry of the same trigger collapses to a no-op.
  eventId: z.string().min(1),
  providerCallId: z.string().min(1),
  reason: escalationReasonSchema,
  // Short free text surfaced to staff ("caller asked for a person",
  // "booking failed 3x"). Capped so the row can never hold a transcript.
  detail: z.string().trim().max(500).optional(),
  // The LiveKit room the caller is in right now. Staff get a token for exactly
  // this room, so a missing value means the call cannot be joined.
  roomName: z.string().trim().min(1, "roomName is required.").max(200),
  at: z.string().datetime().nullish().transform((v) => v ?? undefined),
});

// Staff-side transition on an existing escalation. Deliberately tiny: a claim
// records WHO took the call, a resolve closes it out. Both are idempotent.
export const callEscalationActionSchema = z.object({
  action: z.enum(["claim", "resolve"]),
});

export type VoiceEscalateBody = z.infer<typeof voiceEscalateBodySchema>;
export type EscalationReasonInput = z.infer<typeof escalationReasonSchema>;
export type CallEscalationActionInput = z.infer<typeof callEscalationActionSchema>;
