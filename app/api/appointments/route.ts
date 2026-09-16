// Aiva — appointments collection endpoint.

import type { NextRequest } from "next/server";
import type { AppointmentStatus } from "@prisma/client";
import { withApiCan } from "@/lib/api/with-staff";
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
  PatientConflictError,
} from "@/lib/appointments/mutations";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import { doctorScope } from "@/lib/role-scope";

export const runtime = "nodejs";

export const GET = withApiCan(["appointment:read"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
  const scope = doctorScope(staff);
  const scopeDoctorId = scope.limited ? scope.doctorId ?? undefined : undefined;
  if (scope.limited && !scopeDoctorId) {
    return ok({ items: [], total: 0 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.getAll("status") as AppointmentStatus[];
  const requestedDoctorId = url.searchParams.get("doctorId") ?? undefined;
  const result = await listAppointments(staff, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    status: status.length ? status : undefined,
    // Doctor logins are pinned to their own doctor; they may not filter to
    // someone else's schedule.
    doctorId: scope.limited ? scopeDoctorId : requestedDoctorId,
    patientId: url.searchParams.get("patientId") ?? undefined,
    take: Number(url.searchParams.get("take") ?? "100"),
    skip: Number(url.searchParams.get("skip") ?? "0"),
  });
  return ok(result);
});

export const POST = withApiCan(["appointment:write"])(async (
  req: NextRequest,
  _ctx,
  staff,
) => {
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
    if (e instanceof PatientConflictError) {
      return fail(
        "PATIENT_CONFLICT",
        e.message,
        409,
        {
          conflicts: e.conflicts.map(
            (c) => `${c.doctorName} on ${c.date} at ${c.time}`,
          ),
        },
      );
    }
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
