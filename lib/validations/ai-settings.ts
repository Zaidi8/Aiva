// Aiva — AiSettings zod schema. Singleton per-clinic; only PATCH ever runs.

import { z } from "zod";

export const updateAiSettingsSchema = z.object({
  agentName: z.string().trim().min(1).max(60).optional(),
  greetingMessage: z.string().trim().min(1).max(1000).optional(),
  autoBook: z.boolean().optional(),
  sendConfirmations: z.boolean().optional(),
  handleRescheduling: z.boolean().optional(),
  emergencyTransfer: z.boolean().optional(),
});

export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;
