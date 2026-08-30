// POST /api/voice/call-ended
// Finalizes a CallLog row. The runtime sends this after it hangs up and
// generates a summary; it may also write back patientId / appointmentId
// once the AI resolves the caller and (if applicable) creates an appointment.
//
// {
//   "eventId": "<provider-stable-id>",
//   "providerCallId": "<call-id>",
//   "endedAt": "<ISO>",                    // optional; defaults to now
//   "durationSec": 123,                    // optional; computed from start
//   "outcome": "Completed" | "Assisted" | "Transferred" | "Failed",
//   "detectedIntent": "Booking" | "Reschedule" | "Cancellation" | "Inquiry",
//   "sentiment": "Positive" | "Neutral" | "Negative",
//   "recordingUrl": "<url>",
//   "patientId": "<id>",                   // optional; resolved caller
//   "appointmentId": "<id>"                // optional; resulting booking
// }

import { z } from "zod";
import { CallOutcome, CallSentiment, CallType } from "@prisma/client";
import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failNotFound, failValidation } from "@/lib/api/response";
import { withIdempotency } from "@/lib/voice/webhook-idempotency";
import { endCall } from "@/lib/calls/mutations";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().min(1),
  providerCallId: z.string().min(1),
  endedAt: z.string().datetime().nullish().transform((v) => v ?? undefined),
  durationSec: z.number().int().min(0).optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  detectedIntent: z.nativeEnum(CallType).optional(),
  sentiment: z.nativeEnum(CallSentiment).optional(),
  recordingUrl: z.string().url().optional(),
  patientId: z.string().cuid().nullable().optional(),
  appointmentId: z.string().cuid().nullable().optional(),
});

export const POST = withWebhookSecret(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  let updated: Awaited<ReturnType<typeof endCall>> = null;
  const verdict = await withIdempotency(
    {
      provider: "voice",
      providerEventId: parsed.data.eventId,
      eventType: "call.ended",
      payload: parsed.data,
    },
    async () => {
      updated = await endCall({
        providerCallId: parsed.data.providerCallId,
        endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : undefined,
        durationSec: parsed.data.durationSec,
        outcome: parsed.data.outcome,
        detectedIntent: parsed.data.detectedIntent,
        sentiment: parsed.data.sentiment,
        recordingUrl: parsed.data.recordingUrl,
        patientId: parsed.data.patientId ?? undefined,
        appointmentId: parsed.data.appointmentId ?? undefined,
      });
      if (!updated) throw new Error("Unknown providerCallId");
    },
  );

  if (verdict.status === "failed") {
    if (verdict.error === "Unknown providerCallId") {
      return failNotFound("Call");
    }
    return fail("WEBHOOK_FAILED", verdict.error, 500);
  }
  return ok({ duplicate: verdict.status === "duplicate" });
});
