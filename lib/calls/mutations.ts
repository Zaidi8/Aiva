// Aiva — CallLog writes used by the voice webhook handlers.
//
// These run in a tenant-resolved-via-voice-number context (no authenticated
// staff), so the helpers take a `clinicId` directly instead of a staff object.

import "server-only";
import type {
  CallLog,
  CallOutcome,
  CallSentiment,
  CallType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface StartCallInput {
  clinicId: string;
  providerCallId: string;
  patientPhone: string;
  startedAt?: Date;
}

export async function startCall(input: StartCallInput): Promise<CallLog> {
  // Upsert so retried "call.started" events are idempotent at the data layer
  // in addition to the WebhookEvent guard. providerCallId is @unique.
  return prisma.callLog.upsert({
    where: { providerCallId: input.providerCallId },
    update: {},
    create: {
      clinicId: input.clinicId,
      providerCallId: input.providerCallId,
      patientPhone: input.patientPhone,
      startedAt: input.startedAt ?? new Date(),
    },
  });
}

export interface AppendTranscriptInput {
  providerCallId: string;
  turn: {
    role: "user" | "assistant" | "system";
    text: string;
    at?: string; // ISO timestamp
  };
}

export async function appendTranscriptTurn(
  input: AppendTranscriptInput,
): Promise<CallLog | null> {
  // Postgres JSONB append: read-modify-write. Race-safe for a single provider
  // sending sequential chunks; if turns ever arrive in parallel, switch to
  // jsonb_set with a CTE.
  const existing = await prisma.callLog.findUnique({
    where: { providerCallId: input.providerCallId },
    select: { id: true, transcript: true },
  });
  if (!existing) return null;
  const turns = Array.isArray(existing.transcript)
    ? (existing.transcript as Prisma.JsonArray)
    : ([] as Prisma.JsonArray);
  const next: Prisma.JsonArray = [
    ...turns,
    {
      ...input.turn,
      at: input.turn.at ?? new Date().toISOString(),
    } as Prisma.JsonObject,
  ];
  return prisma.callLog.update({
    where: { id: existing.id },
    data: { transcript: next },
  });
}

export interface EndCallInput {
  providerCallId: string;
  endedAt?: Date;
  durationSec?: number;
  outcome?: CallOutcome;
  detectedIntent?: CallType;
  sentiment?: CallSentiment;
  recordingUrl?: string;
  patientId?: string | null;
  appointmentId?: string | null;
}

export async function endCall(input: EndCallInput): Promise<CallLog | null> {
  const existing = await prisma.callLog.findUnique({
    where: { providerCallId: input.providerCallId },
    select: { id: true, startedAt: true, durationSec: true },
  });
  if (!existing) return null;
  const endedAt = input.endedAt ?? new Date();
  const computedDuration =
    input.durationSec ??
    Math.max(0, Math.floor((endedAt.getTime() - existing.startedAt.getTime()) / 1000));
  return prisma.callLog.update({
    where: { id: existing.id },
    data: {
      endedAt,
      durationSec: computedDuration,
      outcome: input.outcome,
      detectedIntent: input.detectedIntent,
      sentiment: input.sentiment,
      recordingUrl: input.recordingUrl,
      patientId: input.patientId ?? undefined,
      appointmentId: input.appointmentId ?? undefined,
    },
  });
}
