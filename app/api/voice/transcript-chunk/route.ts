// POST /api/voice/transcript-chunk
// Appends one turn to CallLog.transcript. Provider sends per-utterance.
//
// {
//   "eventId": "<provider-stable-id>",
//   "providerCallId": "<call-id>",
//   "role": "user" | "assistant" | "system",
//   "text": "<utterance>",
//   "at": "<ISO>"                          // optional
// }

import { z } from "zod";
import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation, failNotFound } from "@/lib/api/response";
import { withIdempotency } from "@/lib/voice/webhook-idempotency";
import { appendTranscriptTurn } from "@/lib/calls/mutations";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().min(1),
  providerCallId: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  text: z.string().min(1),
  at: z.string().datetime().nullish().transform((v) => v ?? undefined),
});

export const POST = withWebhookSecret(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  let appended: Awaited<ReturnType<typeof appendTranscriptTurn>> = null;
  const verdict = await withIdempotency(
    {
      provider: "voice",
      providerEventId: parsed.data.eventId,
      eventType: "call.transcript-chunk",
      payload: parsed.data,
    },
    async () => {
      appended = await appendTranscriptTurn({
        providerCallId: parsed.data.providerCallId,
        turn: {
          role: parsed.data.role,
          text: parsed.data.text,
          at: parsed.data.at,
        },
      });
      if (!appended) throw new Error("Unknown providerCallId");
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
