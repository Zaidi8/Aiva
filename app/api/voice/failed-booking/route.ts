// Aiva — Phase 2: park a failed voice-appointment write for later reconciliation.
//
// Called by the Python agent's `_post` after it has exhausted its own retries on
// a book / cancel / reschedule write. It records the unresolved request (the
// resolved doctor name, date/time, phone, etc.) in the `failed_booking` table so
// the operation is never silently lost — even if the caller has already hung up
// by the time the failure surfaces. Clinic staff / a reconciliation job can then
// review and replay these rows. This endpoint is fire-and-forget best-effort.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  action: z.enum(["book", "cancel", "reschedule"]),
  payload: z.record(z.string(), z.unknown()),
  attempts: z.number().int().min(1).default(1),
  error: z.string().max(2000).optional(),
});

export const POST = withWebhookSecret(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, action, payload, attempts, error } = parsed.data;

  try {
    const row = await prisma.failedBooking.create({
      data: { clinicId, action, payload: payload as never, attempts, error },
      select: { id: true },
    });
    return ok({ recorded: true, id: row.id });
  } catch {
    return fail(
      "RECORD_FAILED",
      "Could not persist the failed booking for reconciliation.",
      500,
    );
  }
});
