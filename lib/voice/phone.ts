// Aiva — phone normalization for the voice path.
//
// Callers speak numbers in many shapes ("0300 123 4567", "+92 300-1234567").
// Patient.phoneNumber is NOT unique, and the voice booking matches/creates
// patients by exact string equality on this field — so inconsistent formatting
// would create duplicate patient rows and break repeat-caller reuse and the
// idempotent-rebook detection. Normalizing to a single canonical form keeps a
// caller mapped to one patient record.
//
// This is deliberately conservative: strip everything except digits and a single
// leading "+". We do not infer country codes (that needs the clinic's region and
// is out of scope) — we only canonicalize whitespace/punctuation differences.

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}
