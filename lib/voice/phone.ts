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

// ────────────────────────────────────────────────────────────────────────────
// E.164 formatting for outbound SMS (TextBee et al. require it).
//
// Patient.phoneNumber is stored in the canonical-but-not-E.164 form above
// ("03001234567" with a leading + if the caller dialed it, "00…" if they
// didn't). SMS gateways reject anything without an international prefix, so
// before sending we convert to "+92…" style. Rules, applied to a normalized
// number:
//   "+…"            → already E.164, returned untouched
//   "00…"           → "00" is the E.164 recommendation's placeholder prefix; swap
//                     it for "+"
//   "0…" (national trunk) → replace the leading 0 with "+<countryCode>"
//   "<digits>"      → bare international digits already carry the country code;
//                     just prepend "+"
//
// `countryCode` is the callers' home region (default 92 = Pakistan, matching
// the clinic timezone default). Deployments in another country set
// SMS_DEFAULT_COUNTRY_CODE.
// ────────────────────────────────────────────────────────────────────────────

export function toE164(phone: string, countryCode: string = "92"): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("+")) return normalized;
  if (normalized.startsWith("00")) return `+${normalized.slice(2)}`;
  if (normalized.startsWith("0")) return `+${countryCode}${normalized.slice(1)}`;
  return `+${normalized}`;
}
