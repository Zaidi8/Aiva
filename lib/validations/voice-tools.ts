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
  // Phase 5: the clinic-local time the caller actually asked for ("HH:mm", 24h).
  // When present the endpoint reports whether THAT time is open plus the nearest
  // alternatives, instead of dumping every slot of the day (Phase 5 bug #3).
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:mm (24h).")
    .optional(),
  // Phase 10: clinic-local time WINDOW the caller asked for, expressed as
  // optional from/to edges ("HH:mm", 24h) — "between 4 and 5", "in the
  // morning", "after 2". When at least one edge is present the endpoint
  // reports the open slots INSIDE the window plus the nearest open slot just
  // outside each edge, instead of dumping the whole day.
  from: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "from must be HH:mm (24h).")
    .optional(),
  to: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "to must be HH:mm (24h).")
    .optional(),
}).refine(
  (v) => !(v.from && v.to) || v.from <= v.to,
  "to must not be earlier than from."
);

export const voiceAppointmentsQuerySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  phone: z.string().trim().min(3, "phone is required.").max(32),
});

// Reusable: a real calendar date in YYYY-MM-DD (rejects 2026-13-40 etc.).
const calendarDate = z
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
  }, "date is not a valid calendar date.");

// Reusable: clinic-local wall-clock "HH:mm" (24h).
const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:mm (24h).");

const doctorName = z.string().trim().min(1, "doctorName is required.").max(120);
const phone = z.string().trim().min(3, "phone is required.").max(32);

// Phase 4 booking (write). The agent sends a resolved doctor name, an absolute
// date + "HH:mm" time (clinic-local), the caller's phone, and — for a first-time
// caller — their name. patientName is optional: existing callers are matched by
// phone, and a missing name falls back to a placeholder.
//
// `confirm` is the caller's spoken acceptance of a same-time conflict warning
// (Phase 11). When the same patient already has a non-cancelled appointment that
// overlaps the requested slot under a DIFFERENT doctor, the endpoint refuses
// with `reason: "conflict"` until the agent confirms on the caller's behalf.
export const voiceBookBodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  doctorName,
  date: calendarDate,
  time: clockTime,
  phone,
  patientName: z.string().trim().min(1).max(120).optional(),
  confirm: z.boolean().optional(),
});

// Phase 6 cancel (write). Identifies the appointment by the caller's phone plus
// the doctor + clinic-local date/time the caller states (the agent reads these
// from a prior lookup). No DB ids are exposed to the voice layer.
export const voiceCancelBodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  doctorName,
  date: calendarDate,
  time: clockTime,
  phone,
});

// Phase 6 reschedule (write). Same identity fields as cancel (doctor + current
// date/time + phone) plus the NEW clinic-local date/time to move it to. The
// doctor stays the same; the new slot is validated against the schedule grid.
//
// `confirm` (Phase 11) behaves like booking: the endpoint refuses to move the
// appointment onto a time that overlaps another of this patient's appointments
// with a different doctor unless the agent confirms on the caller's behalf.
export const voiceRescheduleBodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required."),
  doctorName,
  date: calendarDate,
  time: clockTime,
  newDate: calendarDate,
  newTime: clockTime,
  phone,
  confirm: z.boolean().optional(),
});

export type VoiceDoctorsQuery = z.infer<typeof voiceDoctorsQuerySchema>;
export type VoiceAvailabilityQuery = z.infer<typeof voiceAvailabilityQuerySchema>;
export type VoiceAppointmentsQuery = z.infer<typeof voiceAppointmentsQuerySchema>;
export type VoiceBookBody = z.infer<typeof voiceBookBodySchema>;
export type VoiceCancelBody = z.infer<typeof voiceCancelBodySchema>;
export type VoiceRescheduleBody = z.infer<typeof voiceRescheduleBodySchema>;
