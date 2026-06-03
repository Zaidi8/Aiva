// Aiva — Phase 3 voice tool: list/search doctors (read-only).
//
// Called by the Python agent's `list_doctors` tool. Scoped to the single
// clinicId the worker passes; delegates to the existing tenant-scoped helper.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listActiveDoctors } from "@/lib/doctors/queries";
import { matchDoctor } from "@/lib/voice/doctor-match";
import { voiceDoctorsQuerySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

export const GET = withWebhookSecret(async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = voiceDoctorsQuerySchema.safeParse({
    clinicId: searchParams.get("clinicId") ?? "",
    q: searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) return failValidation(parsed.error);

  try {
    // Fetch all active doctors, then match in-memory so spoken specialty terms
    // ("cardiologist" → "Cardiology") resolve — strict DB substring search can't.
    const items = await listActiveDoctors({ clinicId: parsed.data.clinicId });

    let matched = items;
    if (parsed.data.q) {
      const result = matchDoctor(items, parsed.data.q);
      matched =
        result.matched === "one" && result.doctor
          ? [result.doctor]
          : result.matched === "many" && result.candidates
            ? result.candidates
            : [];
    }

    return ok({
      doctors: matched.map((d) => ({
        id: d.id,
        name: d.name,
        specialization: d.specialization,
      })),
    });
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
