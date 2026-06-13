// Aiva — date helpers for the voice tool endpoints.
//
// Phase 4 convention (corrected): all instants are TRUE instants. A clinic-local
// wall-clock time of 09:00 in Asia/Karachi is the instant T04:00:00Z — the same
// convention Appointment.scheduledAt already uses, and the dashboard. The Phase 3
// UTC-wall-clock shortcut (and utcWallClockTime) is gone; computeAvailability now
// emits true instants and the endpoints render them with toLocalTime/toLocalDate.

// Build [from, to] bounding the clinic-local calendar day for `date`, widened by
// ±1 day. computeAvailability walks day-by-day and filters each generated slot to
// the requested local date, so over-wide bounds are safe; the padding guarantees
// the local day is fully covered no matter the clinic's UTC offset.
export function localDayBoundsUTC(date: string): { from: Date; to: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const dayMs = 24 * 60 * 60 * 1000;
  const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - dayMs);
  const to = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + dayMs);
  return { from, to };
}

// Convert a clinic-local wall-clock time (date "YYYY-MM-DD" + "HH:mm" in the
// given IANA timezone) to the true UTC instant. DST-correct: it derives the
// zone's offset at that local moment by formatting a probe instant in the zone
// and measuring the delta, then applies it. This is the inverse of toLocalTime.
export function localWallClockToInstant(
  date: string,
  time: string,
  tz: string,
): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // Treat the local wall-clock fields as if they were UTC, then correct by the
  // zone's offset at that instant. Two passes handle the rare DST-boundary case
  // where the offset used to compute differs from the offset at the result.
  const asUTC = Date.UTC(y, mo - 1, d, h, mi);
  let instant = new Date(asUTC - tzOffsetMs(new Date(asUTC), tz));
  instant = new Date(asUTC - tzOffsetMs(instant, tz));
  return instant;
}

// Offset (ms) of `tz` at `instant`: localWallClock(instant) - instant.
function tzOffsetMs(instant: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - instant.getTime();
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
