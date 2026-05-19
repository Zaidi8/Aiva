// Aiva — Patients collection route.
//
// GET  /api/patients        → list patients in the caller's clinic
// POST /api/patients        → create a new patient in the caller's clinic
//
// Auth is enforced per-handler via withApiStaff (the proxy excludes /api/*).
// Tenant scoping is delegated to the Prisma helpers — we pass `staff` through.

import type { NextRequest } from "next/server";

import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  created,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listPatients } from "@/lib/patients/queries";
import { createPatient } from "@/lib/patients/mutations";
import { createPatientSchema } from "@/lib/validations/patient";

// Prisma requires the Node.js runtime.
export const runtime = "nodejs";

export const GET = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") ?? undefined;

  const takeRaw = searchParams.get("take");
  const skipRaw = searchParams.get("skip");

  const takeParsed = takeRaw === null ? 50 : Number(takeRaw);
  const skipParsed = skipRaw === null ? 0 : Number(skipRaw);

  const take = Number.isFinite(takeParsed) ? takeParsed : 50;
  const skip = Number.isFinite(skipParsed) ? skipParsed : 0;

  const { items, total } = await listPatients(staff, { q, take, skip });
  return ok({ items, total });
});

export const POST = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const body = await req.json().catch(() => null);
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  try {
    const patient = await createPatient(staff, parsed.data);
    return created(patient);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
