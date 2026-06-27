// Shared dashboard types. Domain-model types (Patient, Appointment, etc.)
// live in @prisma/client and should be imported from there; this file only
// holds shapes that don't have a 1:1 Prisma model behind them.

export type PageType =
  | 'login'
  | 'dashboard'
  | 'appointments'
  | 'patients'
  | 'doctors'
  | 'team'
  | 'ai-receptionist'
  | 'analytics'
  | 'settings'
  | 'ui-kit';

// Shape of a single utterance in a call transcript. CallLog.transcript is a
// JSON column on the DB side; this interface matches what the dashboard
// renders. The voice runtime writes records of this shape into the array.
//
// NOTE: kept compatible with the older `speaker` field (used by the UIKit
// showcase components) — newer rows from the AI runtime use `role`. Consumers
// should fall back appropriately when only one is present.
export interface CallTranscriptSegment {
  id: string;
  speaker: 'patient' | 'ai';
  text: string;
  timestamp: string;
  duration: string;
}
