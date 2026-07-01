// Aiva — write helper for the caller's Clinic row.
//
// Same tenant-scoping rule as patients/doctors: the route passes `staff`, the
// mutation pins the clinicId from the staff context — never trusting a clinicId
// from the request body.
//
// voicePhone is the clinic's inbound AI number. Two rules apply on write:
//   1. It is normalized to a canonical form (matching lib/voice/phone.ts) so
//      the voice runtime — which resolves a clinic by exact-matching the dialed
//      number to voicePhone — doesn't silently fail on a formatting difference.
//   2. Setting a NON-empty voicePhone is a "go live" action: it's gated on the
//      clinic having at least one active doctor with a weekly schedule.
//      Otherwise the AI would answer calls it can't fulfil (nothing bookable).

import "server-only";
import type { Clinic, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { normalizePhone } from "@/lib/voice/phone";
import type { UpdateClinicInput } from "@/lib/validations/clinic";

// Thrown when a caller tries to set voicePhone (go live) before the clinic can
// actually book anyone. The route maps this to a 409 with the message.
export class GoLiveNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoLiveNotReadyError";
  }
}

// A clinic is bookable once it has >=1 active doctor with >=1 schedule row —
// the same condition computeAvailability needs to return any slot.
export async function hasBookableDoctor(
  staff: Pick<ClinicStaff, "clinicId">,
): Promise<boolean> {
  const count = await prisma.doctor.count({
    where: {
      ...clinicWhere(staff),
      deactivatedAt: null,
      schedules: { some: {} },
    },
  });
  return count > 0;
}

export async function updateClinic(
  staff: Pick<ClinicStaff, "clinicId">,
  input: UpdateClinicInput,
): Promise<Clinic> {
  const data: UpdateClinicInput = { ...input };

  // Canonicalize + gate voicePhone. `undefined` = field absent from the patch
  // (leave as-is); "" was already normalized to undefined by the schema, so a
  // present string here is a real number the caller is enabling.
  if (typeof data.voicePhone === "string") {
    const normalized = normalizePhone(data.voicePhone);
    if (normalized && !(await hasBookableDoctor(staff))) {
      throw new GoLiveNotReadyError(
        "Add at least one doctor with working hours before connecting your AI phone number — otherwise the receptionist can answer but can't book anyone.",
      );
    }
    data.voicePhone = normalized;
  }

  return prisma.clinic.update({
    where: { id: staff.clinicId },
    data,
  });
}
