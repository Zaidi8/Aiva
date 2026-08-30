// POST /api/voice/incoming-call
// Called when a new inbound voice call connects. Body shape is intentionally
// minimal — adapt to the chosen voice provider's payload at integration time.
//
// {
//   "eventId": "<provider-stable-id>",   // for idempotency
//   "providerCallId": "<call-id>",       // provider's stable call id
//   "to": "+923000000001",               // dialed number → resolves clinic
//   "from": "+923009999999",             // caller phone
//   "startedAt": "<ISO>",                // optional; defaults to now
//   "clinicId": "<clinic-id>"            // optional; if given, overrides the
//                                        //   voice-number → clinic lookup. The
//                                        //   agent sends this since a single
//                                        //   worker already knows its clinic.
// }

import { z } from "zod";
import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { withIdempotency } from "@/lib/voice/webhook-idempotency";
import { getClinicByVoicePhone } from "@/lib/voice/clinic-resolver";
import { startCall } from "@/lib/calls/mutations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  eventId: z.string().min(1),
  providerCallId: z.string().min(1),
  to: z.string().min(3),
  from: z.string().min(3),
  startedAt: z.string().datetime().nullish().transform((v) => v ?? undefined),
  clinicId: z.string().cuid().optional(),
});

type ResolvedClinic = { id: string };

async function resolveClinic(body: {
  to: string;
  clinicId?: string;
}): Promise<ResolvedClinic | null> {
  // The agent passes its own clinicId (AIVA_CLINIC_ID), bypassing the
  // voice-number → clinic lookup — useful while clinics may not have a
  // `voicePhone` configured yet. This is safe because the whole endpoint is
  // guarded by x-webhook-secret.
  if (body.clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: body.clinicId },
      select: { id: true },
    });
    return clinic;
  }
  return getClinicByVoicePhone(body.to);
}

export const POST = withWebhookSecret(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  const clinic = await resolveClinic(parsed.data);
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
