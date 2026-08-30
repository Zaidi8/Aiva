// GET  /api/ai-settings  → 200 { data: AiSettings }   (or auto-creates defaults)
// PATCH /api/ai-settings → 200 { data: AiSettings }

import type { NextRequest } from "next/server";
import { withApiCan } from "@/lib/api/with-staff";
import { ok, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { getAiSettings } from "@/lib/ai-settings/queries";
import { updateAiSettings } from "@/lib/ai-settings/mutations";
import { updateAiSettingsSchema } from "@/lib/validations/ai-settings";

export const runtime = "nodejs";

export const GET = withApiCan(["ai:manage", "dashboard:view"])(async (
  _req: NextRequest,
  _ctx,
  staff,
) => {
  let settings = await getAiSettings(staff);
  if (!settings) {
    // Auto-bootstrap if missing (defensive — register normally seeds it).
    settings = await updateAiSettings(staff, {});
  }
  return ok(settings);
});

export const PATCH = withApiCan(["ai:manage"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const body = await req.json().catch(() => null);
  const parsed = updateAiSettingsSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const settings = await updateAiSettings(staff, parsed.data);
    return ok(settings);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
