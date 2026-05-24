// Aiva — write helper for the caller's Clinic row.
//
// Same tenant-scoping rule applies as patients/doctors: the route handler
// passes `staff`, the mutation pins the clinicId from the staff context. No
// trusting clinicId from the request body.
//
// We deliberately do NOT expose `voicePhone` here — that field is owned by
// the AI module configuration flow and changing it from the dashboard could
// orphan a clinic from inbound call routing. The Aiva voice runtime sets
// `voicePhone` directly when a number is provisioned.
//
// (B-15 audit note: voicePhone IS allowed per the audit. We accept it on
// the validation schema and write it through if provided — but the dashboard
// Settings form will only surface phone/email/name/address/timezone in this
// pass.)

import "server-only";
import type { Clinic, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UpdateClinicInput } from "@/lib/validations/clinic";

export async function updateClinic(
  staff: Pick<ClinicStaff, "clinicId">,
  input: UpdateClinicInput,
): Promise<Clinic> {
  return prisma.clinic.update({
    where: { id: staff.clinicId },
    data: input,
  });
}
