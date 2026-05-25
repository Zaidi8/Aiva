// GET /api/voice/clinic-context?clinicId=<id>
//
// Returns the locked ClinicContextDTO consumed by the Python voice agent on
// every call. Auth: `x-webhook-secret` header (shared with other voice
// webhooks). The route is read-only and side-effect free.

import { z } from "zod";
import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { getClinicContext } from "@/lib/voice/clinic-context";

export const runtime = "nodejs";

const querySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
});

export const GET = withWebhookSecret(async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    clinicId: searchParams.get("clinicId") ?? "",
  });
  if (!parsed.success) return failValidation(parsed.error);

  const context = await getClinicContext(parsed.data.clinicId);
  if (!context) {
    return fail(
      "CLINIC_NOT_FOUND",
      `No clinic with id ${parsed.data.clinicId}.`,
      404,
    );
  }

  return ok(context);
});
