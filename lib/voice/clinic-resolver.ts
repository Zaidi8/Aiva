// Resolve an inbound voice call's clinic from the dialed number.
// Clinic.voicePhone is @unique — exactly one match or none.

import "server-only";
import type { Clinic } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getClinicByVoicePhone(
  toNumber: string,
): Promise<Clinic | null> {
  return prisma.clinic.findUnique({ where: { voicePhone: toNumber } });
}
