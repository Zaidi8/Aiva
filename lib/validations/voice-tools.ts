// Aiva — Phase 3 voice read-only tool query schemas.
//
// These validate the query params for the /api/voice/{doctors,availability,
// appointments} endpoints the Python voice agent calls as LLM tools. All
// read-only; all scoped to a single clinicId passed by the worker.

import { z } from "zod";

export const voiceDoctorsQuerySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  q: z.string().trim().min(1).max(120).optional(),
});

export const voiceAvailabilityQuerySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  doctorName: z.string().trim().min(1, "doctorName is required.").max(120),
  // Clinic-local calendar day, YYYY-MM-DD. The refine rejects format-valid but
  // impossible dates (e.g. 2026-13-40) that would otherwise roll over silently.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD.")
    .refine((d) => {
      const [y, m, day] = d.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, day));
      return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === day
      );
    }, "date is not a valid calendar date."),
});

export const voiceAppointmentsQuerySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  phone: z.string().trim().min(3, "phone is required.").max(32),
});

export type VoiceDoctorsQuery = z.infer<typeof voiceDoctorsQuerySchema>;
export type VoiceAvailabilityQuery = z.infer<typeof voiceAvailabilityQuerySchema>;
export type VoiceAppointmentsQuery = z.infer<typeof voiceAppointmentsQuerySchema>;
