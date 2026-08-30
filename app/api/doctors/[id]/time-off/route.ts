// Aiva — doctor time-off collection endpoint.
//
// GET  /api/doctors/[id]/time-off → { items: DoctorTimeOff[] }
// POST /api/doctors/[id]/time-off → create a date-range override

import type { NextRequest } from "next/server";
import { withApiCan } from "@/lib/api/with-staff";
import { ok, created, failNotFound, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listTimeOff, createTimeOff } from "@/lib/doctors/schedule";
import { createTimeOffSchema } from "@/lib/validations/schedule";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const GET = withApiCan<Ctx>(["doctor:read"])(async (
  _req,
  { params },
  staff,
) => {
  const { id } = await params;
  const items = await listTimeOff(staff, id);
  if (items === null) return failNotFound("Doctor");
  return ok({ items });
});

export const POST = withApiCan<Ctx>(["doctor:write"])(
  async (req: NextRequest, { params }, staff) => {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = createTimeOffSchema.safeParse(body);
    if (!parsed.success) return failValidation(parsed.error);
    try {
      const timeOff = await createTimeOff(staff, id, parsed.data);
      if (timeOff === null) return failNotFound("Doctor");
      return created(timeOff);
    } catch (e) {
      const mapped = mapPrismaError(e);
      if (mapped) return mapped;
      throw e;
    }
  },
);
