// Aiva — Doctor schedule + time-off zod schemas.
//
// DoctorSchedule stores weekly recurring availability: per dayOfWeek (0=Sun),
// a startTime/endTime as "HH:mm" CLINIC-LOCAL strings and a slot length. The
// PUT endpoint replaces the WHOLE weekly grid in one shot (see
// replaceDoctorSchedule), so the body is the full set of working days; any day
// not present means "not working".
//
// DoctorTimeOff stores date ranges (calendar dates, clinic-local) that subtract
// from the recurring schedule.

import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h HH:mm
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

export const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_RE, "Use HH:mm (24h)."),
    endTime: z.string().regex(TIME_RE, "Use HH:mm (24h)."),
    slotDurationMinutes: z.number().int().min(5).max(240).default(30),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const putScheduleSchema = z.object({
  days: z
    .array(scheduleDaySchema)
    .max(7)
    .refine((arr) => new Set(arr.map((d) => d.dayOfWeek)).size === arr.length, {
      message: "Each weekday can appear only once.",
      path: ["days"],
    }),
});

export const createTimeOffSchema = z
  .object({
    startDate: z.string().regex(DATE_RE, "Use YYYY-MM-DD."),
    endDate: z.string().regex(DATE_RE, "Use YYYY-MM-DD."),
    reason: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

export type ScheduleDayInput = z.infer<typeof scheduleDaySchema>;
export type PutScheduleInput = z.infer<typeof putScheduleSchema>;
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;
