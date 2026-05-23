// Aiva — doctors collection endpoint.

import type { NextRequest } from "next/server";
import { withApiStaff } from "@/lib/api/with-staff";
import { ok, created, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listDoctors } from "@/lib/doctors/queries";
import { createDoctor } from "@/lib/doctors/mutations";
import { createDoctorSchema } from "@/lib/validations/doctor";

export const runtime = "nodejs";

export const GET = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const take = Number(url.searchParams.get("take") ?? "50");
  const skip = Number(url.searchParams.get("skip") ?? "0");
  const includeDeactivated =
    url.searchParams.get("includeDeactivated") === "true";
  const result = await listDoctors(staff, { q, take, skip, includeDeactivated });
  return ok(result);
});

export const POST = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const body = await req.json().catch(() => null);
  const parsed = createDoctorSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const doctor = await createDoctor(staff, parsed.data);
    return created(doctor);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
