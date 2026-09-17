// Aiva — SMS provider abstraction.
//
// All outbound-SMS concerns go through this tiny interface so the rest of the
// app never depends on TextBee (or any single vendor) directly. Swap providers
// by changing what `getSmsProvider()` returns — the dispatch logic in
// lib/notifications/mutations.ts is untouched.
//
// The provider contract is deliberately minimal and BEST-EFFORT shaped: every
// send resolves with a result, never throws. Callers treat `success: false` as
// "log it and move on" — a failed SMS must never block the appointment write
// that triggered it.

import "server-only";

import { textbeeProvider } from "./textbee";

export interface SmsSendInput {
  /** Recipient in E.164 (e.g. "+923001234567"). Providers require this. */
  to: string;
  /** Plain-text SMS body. */
  message: string;
}

export interface SmsSendResult {
  success: boolean;
  /** Provider-side reference for the send (e.g. TextBee smsBatchId). */
  providerRef?: string;
  /** Human-readable failure detail. Present only when `success` is false. */
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

// Provider selection lives here. When a second vendor lands, branch on an env
// flag (e.g. SMS_PROVIDER=textbee|template) instead of replacing the import.
// Today there is exactly one implementation, so the factory returns it directly.
export function getSmsProvider(): SmsProvider {
  return textbeeProvider;
}