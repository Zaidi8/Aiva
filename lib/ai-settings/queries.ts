// Read the AiSettings row for the calling clinic. Always 1:1 — created at
// signup inside the registration transaction.

import "server-only";
import type { AiSettings, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAiSettings(
  staff: Pick<ClinicStaff, "clinicId">,
): Promise<AiSettings | null> {
  return prisma.aiSettings.findUnique({ where: { clinicId: staff.clinicId } });
}
