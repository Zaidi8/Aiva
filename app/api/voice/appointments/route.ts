// Aiva — Phase 3 voice tool: look up a caller's upcoming appointments (read-only).
//
// Called by the Python agent's `lookup_appointments` tool with a phone number
// the caller speaks. Resolves phone → patient(s) within the clinic, then lists
// their upcoming Pending/Confirmed appointments.

import { withWebhookSecret } from "@/lib/api/with-webhook-secret";
import { ok, fail, failValidation } from "@/lib/api/response";
import { mapPrismaError } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/prisma";
import { listUpcomingAppointmentsByPatients } from "@/lib/appointments/queries";
import { toLocalDate, toLocalTime } from "@/lib/voice/tz";
import { voiceAppointmentsQuerySchema } from "@/lib/validations/voice-tools";

export const runtime = "nodejs";

const MAX_APPTS = 5;

export const GET = withWebhookSecret(async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = voiceAppointmentsQuerySchema.safeParse({
    clinicId: searchParams.get("clinicId") ?? "",
    phone: searchParams.get("phone") ?? "",
  });
  if (!parsed.success) return failValidation(parsed.error);
  const { clinicId, phone } = parsed.data;
  const staff = { clinicId };

  try {
    // findUnique by Clinic PK is safe here: Clinic is the tenant root itself,
    // not a clinic-owned child, so there is no cross-tenant scope to apply.
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    if (!clinic) {
      return fail("CLINIC_NOT_FOUND", `No clinic with id ${clinicId}.`, 404);
    }

    // Match patients in this clinic by phone. A clinic may have >1 record on
    // the same number (e.g. family); gather all their appointments at once.
    const patients = await prisma.patient.findMany({
      where: { clinicId, phoneNumber: phone },
      select: { id: true },
    });
    if (patients.length === 0) {
      return ok({ found: false });
    }

    // Single batched query (no per-patient loop, no parallel count) — keeps the
    // voice path to one connection at a time on the connection_limit=1 pooler.
    // Fetch one extra to know whether to say "and N more".
    const items = await listUpcomingAppointmentsByPatients(staff, {
      patientIds: patients.map((p) => p.id),
      from: new Date(),
      take: MAX_APPTS + 1,
    });

    // Already ordered by scheduledAt asc from the query — format in clinic tz.
    const appointments = items.slice(0, MAX_APPTS).map((a) => ({
      patient: a.patient.fullName,
      doctor: a.doctor.name,
      date: toLocalDate(a.scheduledAt, clinic.timezone),
      time: toLocalTime(a.scheduledAt, clinic.timezone),
      status: a.status,
    }));

    return ok({
      found: true,
      timezone: clinic.timezone,
      appointments,
      hasMore: items.length > MAX_APPTS,
    });
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
