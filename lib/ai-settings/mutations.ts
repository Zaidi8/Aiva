// Update the AiSettings row for the calling clinic. Uses upsert so a missing
// row (e.g. clinics created before the signup-transactional bootstrap) still
// completes the request rather than 404ing.

import "server-only";
import type { AiSettings, ClinicStaff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UpdateAiSettingsInput } from "@/lib/validations/ai-settings";

export function updateAiSettings(
  staff: Pick<ClinicStaff, "clinicId">,
  input: UpdateAiSettingsInput,
): Promise<AiSettings> {
  return prisma.aiSettings.upsert({
    where: { clinicId: staff.clinicId },
    update: input,
    create: { clinicId: staff.clinicId, ...input },
  });
}
