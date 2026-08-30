// Aiva — doctor weekly schedule endpoint.
//
// GET  /api/doctors/[id]/schedule  → { days: DoctorSchedule[] }
// PUT  /api/doctors/[id]/schedule  → replace the whole weekly grid
//
// The schedule drives computeAvailability, which both the booking modal and the
// voice agent read. PUT semantics are replace-all (see replaceDoctorSchedule).

import type { NextRequest } from "next/server";
import { withApiCan } from "@/lib/api/with-staff";
import { ok, failNotFound, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import {
  getDoctorSchedule,
  replaceDoctorSchedule,
} from "@/lib/doctors/schedule";
import { putScheduleSchema } from "@/lib/validations/schedule";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export const GET = withApiCan<Ctx>(["doctor:read"])(async (
  _req,
  { params },
  staff,
) => {
  const { id } = await params;
  const days = await getDoctorSchedule(staff, id);
  if (days === null) return failNotFound("Doctor");
  return ok({ days });
});

export const PUT = withApiCan<Ctx>(["doctor:write"])(
  async (req: NextRequest, { params }, staff) => {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = putScheduleSchema.safeParse(body);
    if (!parsed.success) return failValidation(parsed.error);
    try {
      const days = await replaceDoctorSchedule(staff, id, parsed.data);
      if (days === null) return failNotFound("Doctor");
      return ok({ days });
    } catch (e) {
      const mapped = mapPrismaError(e);
      if (mapped) return mapped;
      throw e;
    }
  },
);
