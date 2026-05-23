// Aiva — appointments collection endpoint.

import type { NextRequest } from "next/server";
import type { AppointmentStatus } from "@prisma/client";
import { withApiStaff } from "@/lib/api/with-staff";
import {
  ok,
  created,
  fail,
  failValidation,
} from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { listAppointments } from "@/lib/appointments/queries";
import {
  createAppointment,
  AppointmentFkError,
} from "@/lib/appointments/mutations";
import { createAppointmentSchema } from "@/lib/validations/appointment";

export const runtime = "nodejs";

export const GET = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.getAll("status") as AppointmentStatus[];
  const result = await listAppointments(staff, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    status: status.length ? status : undefined,
    doctorId: url.searchParams.get("doctorId") ?? undefined,
    patientId: url.searchParams.get("patientId") ?? undefined,
    take: Number(url.searchParams.get("take") ?? "100"),
    skip: Number(url.searchParams.get("skip") ?? "0"),
  });
  return ok(result);
});

export const POST = withApiStaff(async (req: NextRequest, _ctx, staff) => {
  const body = await req.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const appt = await createAppointment(staff, parsed.data);
    return created(appt);
  } catch (e) {
    if (e instanceof AppointmentFkError) {
      return fail("VALIDATION_FAILED", e.message, 422, {
        [e.field]: [e.message],
      });
    }
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
