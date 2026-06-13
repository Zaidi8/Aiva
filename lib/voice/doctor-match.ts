// Aiva — voice-specific doctor matching.
//
// Callers speak loosely: "cardiologist" for a doctor whose specialization is
// "Cardiology", "kids doctor" for "Pediatrics", "Dr Khan" for "Dr. Sara Khan".
// The staff-facing listDoctors() uses strict substring matching, which is right
// for a UI search box but fails these spoken forms. This module adds tolerant
// matching used only by the voice tool endpoints.

import "server-only";
import type { Doctor } from "@prisma/client";

// Spoken specialty word → the root that appears in the stored specialization.
// We match on the root as a substring (case-insensitive), so "cardiologist",
// "cardiology", "cardiac" all resolve to "Cardiology".
const SPECIALTY_SYNONYMS: Record<string, string> = {
  cardiologist: "cardio",
  cardiology: "cardio",
  cardiac: "cardio",
  heart: "cardio",
  dermatologist: "dermat",
  dermatology: "dermat",
  skin: "dermat",
  pediatrician: "pediatr",
  paediatrician: "pediatr",
  pediatrics: "pediatr",
  kids: "pediatr",
  children: "pediatr",
  child: "pediatr",
  neurologist: "neuro",
  neurology: "neuro",
  orthopedic: "orthop",
  orthopaedic: "orthop",
  orthopedist: "orthop",
  bones: "orthop",
  gynecologist: "gyn",
  gynaecologist: "gyn",
  gynecology: "gyn",
  dentist: "dent",
  dental: "dent",
  teeth: "dent",
  ent: "ent",
  psychiatrist: "psychiat",
  psychiatry: "psychiat",
  "general physician": "general",
  "general practitioner": "general",
  gp: "general",
  physician: "general",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Honorifics / filler that carry no identifying signal. Every doctor name starts
// with "dr", so counting it as a name-token overlap made "Dr. <anything>" match
// every doctor (false ambiguous). Strip these before token comparison.
const NAME_STOPWORDS = new Set(["dr", "doctor", "the", "a", "an", "mr", "ms", "mrs"]);

function meaningfulTokens(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t));
}

// Score a doctor against a normalized spoken query. Higher = better; 0 = no match.
function scoreDoctor(doctor: Doctor, query: string): number {
  const name = normalize(doctor.name);
  const spec = normalize(doctor.specialization);

  // Exact-ish name containment is the strongest signal. Guard the
  // query-contains-name direction with a length floor so a very short stored
  // name (e.g. a 1–2 char alias) can't spuriously match an unrelated long query.
  if (name.includes(query) || (name.length >= 3 && query.includes(name))) {
    return 100;
  }

  // Specialty synonym → root substring.
  const root = SPECIALTY_SYNONYMS[query];
  if (root && spec.includes(root)) return 90;

  // Direct specialty substring either direction ("cardio" vs "cardiology").
  if (spec.includes(query) || query.includes(spec)) return 80;

  // Token overlap on the name ("khan" → "dr sara khan", "sara" → same).
  // Stopwords (esp. "dr") are excluded so they don't create spurious matches.
  const qTokens = meaningfulTokens(query);
  const nameTokens = new Set(meaningfulTokens(name));
  const overlap = qTokens.filter((t) => nameTokens.has(t)).length;
  if (overlap > 0) return 50 + overlap;

  // Per-token synonym hit ("kids doctor" → tokens include "kids").
  for (const t of qTokens) {
    const r = SPECIALTY_SYNONYMS[t];
    if (r && spec.includes(r)) return 60;
  }

  return 0;
}

export interface DoctorMatch {
  matched: "one" | "none" | "many";
  doctor?: Doctor;
  candidates?: Doctor[];
}

// Resolve a spoken doctor/specialty query against the clinic's doctor list.
// Returns the single best match, or flags none/ambiguous so the caller-facing
// tool can ask a follow-up question.
export function matchDoctor(doctors: Doctor[], rawQuery: string): DoctorMatch {
  const query = normalize(rawQuery);
  if (!query) return { matched: "none" };

  const scored = doctors
    .map((d) => ({ d, score: scoreDoctor(d, query) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { matched: "none" };

  // If the top score is clearly ahead of the runner-up, take it. Otherwise the
  // query was specialty-level and several doctors qualify → ambiguous.
  const top = scored[0];
  const tied = scored.filter((s) => s.score === top.score);
  if (tied.length === 1) return { matched: "one", doctor: top.d };

  // Multiple equally-good matches: a name-level tie is rare; a specialty-level
  // tie ("do you have a cardiologist" with two cardiologists) is real.
  return { matched: "many", candidates: tied.map((s) => s.d) };
}
