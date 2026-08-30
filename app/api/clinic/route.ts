// Aiva — caller's Clinic row (singleton per tenant).
//
// GET   /api/clinic  → 200 { data: Clinic }
// PATCH /api/clinic  → 200 { data: Clinic }
//
// Both handlers resolve the Clinic via the staff context — there is no `id`
// in the URL because each session is scoped to exactly one clinic.

import type { NextRequest } from "next/server";

import { withApiCan } from "@/lib/api/with-staff";
import {
  ok,
  failNotFound,
  failValidation,
  failConflict,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { getClinic } from "@/lib/clinics/queries";
import { updateClinic, GoLiveNotReadyError } from "@/lib/clinics/mutations";
import { updateClinicSchema } from "@/lib/validations/clinic";

export const runtime = "nodejs";

export const GET = withApiCan(["dashboard:view"])(async (
  _req: NextRequest,
  _ctx,
  staff,
) => {
  const clinic = await getClinic(staff);
  if (!clinic) return failNotFound("Clinic");
  return ok(clinic);
});

export const PATCH = withApiCan(["clinic:write"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const body = await req.json().catch(() => null);
  const parsed = updateClinicSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const clinic = await updateClinic(staff, parsed.data);
    return ok(clinic);
  } catch (e) {
    if (e instanceof GoLiveNotReadyError) return failConflict(e.message);
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
