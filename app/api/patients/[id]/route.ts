// Aiva — Patient instance route.
//
// GET    /api/patients/:id  → fetch a single patient
// PATCH  /api/patients/:id  → partial update
// DELETE /api/patients/:id  → hard delete (cascades per schema)
//
// All handlers are tenant-scoped via the Prisma helpers; a cross-tenant id
// returns 404 (we do not leak the difference between "missing" and "not yours").

import type { NextRequest } from "next/server";

import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  noContent,
  failNotFound,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { getPatient } from "@/lib/patients/queries";
import {
  updatePatient,
  deletePatient,
} from "@/lib/patients/mutations";
import { updatePatientSchema } from "@/lib/validations/patient";

// Prisma requires the Node.js runtime.
export const runtime = "nodejs";

// Next.js 15+: dynamic params arrive as a Promise.
type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiStaff<Ctx>(async (_req, ctx, staff) => {
  const { id } = await ctx.params;
  const patient = await getPatient(staff, id);
  if (!patient) return failNotFound("Patient");
  return ok(patient);
});

export const PATCH = withApiStaff<Ctx>(async (req: NextRequest, ctx, staff) => {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  try {
    const patient = await updatePatient(staff, id, parsed.data);
    if (!patient) return failNotFound("Patient");
    return ok(patient);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});

export const DELETE = withApiStaff<Ctx>(async (_req, ctx, staff) => {
  const { id } = await ctx.params;
  const removed = await deletePatient(staff, id);
  if (!removed) return failNotFound("Patient");
  return noContent();
});
