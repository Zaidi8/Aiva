// POST /api/voice/incoming-call
// Called when a new inbound voice call connects. Body shape is intentionally
// minimal — adapt to the chosen voice provider's payload at integration time.
//
// {
//   "eventId": "<provider-stable-id>",   // for idempotency
//   "providerCallId": "<call-id>",       // provider's stable call id
//   "to": "+923000000001",               // dialed number → resolves clinic
//   "from": "+923009999999",             // caller phone
//   "startedAt": "<ISO>"                 // optional; defaults to now
// }

import { z } from "zod";
import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { withIdempotency } from "@/lib/voice/webhook-idempotency";
import { getClinicByVoicePhone } from "@/lib/voice/clinic-resolver";
import { startCall } from "@/lib/calls/mutations";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().min(1),
  providerCallId: z.string().min(1),
  to: z.string().min(3),
  from: z.string().min(3),
  startedAt: z.string().datetime().optional(),
});

export const POST = withWebhookSecret(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  const clinic = await getClinicByVoicePhone(parsed.data.to);
  if (!clinic) {
    return fail(
      "UNKNOWN_VOICE_NUMBER",
      `No clinic registered for inbound number ${parsed.data.to}.`,
      404,
    );
  }

  const verdict = await withIdempotency(
    {
      provider: "voice",
      providerEventId: parsed.data.eventId,
      eventType: "call.started",
      payload: parsed.data,
    },
    async () => {
      await startCall({
        clinicId: clinic.id,
        providerCallId: parsed.data.providerCallId,
        patientPhone: parsed.data.from,
        startedAt: parsed.data.startedAt
          ? new Date(parsed.data.startedAt)
          : undefined,
      });
    },
  );

  if (verdict.status === "failed") {
    return fail("WEBHOOK_FAILED", verdict.error, 500);
  }
  return ok({ duplicate: verdict.status === "duplicate" });
});
