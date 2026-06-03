// Aiva — date helpers for the voice tool endpoints.
//
// IMPORTANT convention note: lib/appointments/queries.ts#computeAvailability
// treats DoctorSchedule.startTime/endTime ("HH:mm", clinic-local wall clock)
// as UTC wall clock — it builds slot starts with Date.UTC(...,h,m). So a 09:00
// local schedule yields a slot instant of T09:00:00Z. For caller-facing display
// we therefore read those instants back as UTC wall clock, which round-trips to
// the original local digits. (The fact that stored Appointment.scheduledAt uses
// a true tz offset — 09:00 Karachi => T04:00Z — is a separate, pre-existing
// mismatch that only affects booking math; it is out of Phase 3 scope.)

// Build [from, to] covering the full UTC calendar day for `date` (YYYY-MM-DD).
// Matches computeAvailability's UTC-wall-clock day walk so a slot named for
// `date` lands on the correct iteration.
export function localDayBoundsUTC(date: string): { from: Date; to: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const to = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { from, to };
}

// Read a slot/availability instant as UTC "HH:mm" (its clinic-local wall clock,
// given the convention above).
export function utcWallClockTime(instant: Date): string {
  const h = String(instant.getUTCHours()).padStart(2, "0");
  const m = String(instant.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// For genuinely tz-offset instants (e.g. Appointment.scheduledAt), render the
// clinic-local "HH:mm" / "YYYY-MM-DD" using the clinic's IANA timezone.
export function toLocalTime(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    // h23 guarantees 00–23; hour12:false can emit "24:00" on some ICU builds.
    hourCycle: "h23",
  }).format(instant);
}

export function toLocalDate(instant: Date, tz: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
