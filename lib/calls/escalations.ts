// Aiva — human-escalation reads and writes.
//
// Two contexts, deliberately kept together because they are the same feature
// and the same row:
//   • VOICE WEBHOOK side (no authenticated staff) — `markEscalated` takes the
//     caller's clinicId + the provider call id, exactly like lib/calls/
//     mutations.ts, and is guarded by the x-webhook-secret route.
//   • DASHBOARD side (an authenticated staff member) — `getEscalation`,
//     `claimEscalation`, `resolveEscalation` are tenant-scoped with
//     clinicWhere(staff) and can only ever see this clinic's calls.
//
// Like FailedBooking, an escalation is "parked" work: it is written the moment
// the agent gives up, before the caller has necessarily hung up, so nothing is
// lost. Unlike FailedBooking it is also actionable — a staff member can join the
// live LiveKit room and take the call.

import "server-only";
import type {
  ClinicStaff,
  EscalationReason,
  Prisma,
} from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";

type ScopedStaff = Pick<ClinicStaff, "clinicId">;

// Escalation select shared by the voice webhook response, the dashboard list
// include, and the staff join/claim routes — one shape, so the UI never has to
// guess a field name. Deliberately omits clinicId/callLogId: callers already
// hold the tenant/call context, and a narrower row is one less thing to leak.
export const escalationSelect = {
  id: true,
  reason: true,
  status: true,
  detail: true,
  roomName: true,
  claimedByStaffId: true,
  claimedAt: true,
  resolvedAt: true,
  createdAt: true,
} satisfies Prisma.EscalationSelect;

export type EscalationSummary = Prisma.EscalationGetPayload<{
  select: typeof escalationSelect;
}>;

export interface MarkEscalatedInput {
  clinicId: string;
  providerCallId: string;
  reason: EscalationReason;
  detail?: string;
  /** The LiveKit room the caller is in — what staff will join. */
  roomName: string;
  at?: Date;
}

export interface MarkEscalatedResult {
  escalation: EscalationSummary;
  /** True when this call was already escalated (the create lost the unique race). */
  alreadyEscalated: boolean;
}

/**
 * Flag a live call as escalated. At most one Escalation exists per CallLog
 * (unique index), so a retried or double-fired trigger returns the original row
 * instead of creating a second one.
 *
 * Raises when the CallLog is unknown — the webhook turns that into a 404 so the
 * agent's retry logic can see a real failure rather than a silent no-op.
 */
export async function markEscalated(
  input: MarkEscalatedInput,
): Promise<MarkEscalatedResult> {
  const call = await prisma.callLog.findUnique({
    where: { providerCallId: input.providerCallId },
    select: { id: true, clinicId: true },
  });
  if (!call) throw new Error("Unknown providerCallId");
  // Trust the webhook's clinicId only as a cross-tenant guard: the worker is
  // configured with one AIVA_CLINIC_ID, but a mismatch must never let it flag a
  // call belonging to another clinic.
  if (call.clinicId !== input.clinicId) throw new Error("Clinic mismatch");

  const existing = await prisma.escalation.findUnique({
    where: { callLogId: call.id },
    select: { id: true },
  });
  if (existing) {
    return {
      escalation: await prisma.escalation.findUniqueOrThrow({
        where: { id: existing.id },
        select: escalationSelect,
      }),
      alreadyEscalated: true,
    };
  }

  try {
    const created = await prisma.escalation.create({
      data: {
        reason: input.reason,
        detail: input.detail,
        roomName: input.roomName,
        clinicId: call.clinicId,
        callLogId: call.id,
        ...(input.at ? { createdAt: input.at } : {}),
      },
      select: escalationSelect,
    });
    return { escalation: created, alreadyEscalated: false };
  } catch (err) {
    // The check above is not atomic, so two triggers firing for the same call at
    // the same instant both pass it and both try to create. The unique index on
    // callLogId is the real guard: the loser gets P2002 and reads back the
    // winner's row rather than surfacing a 500 the agent would retry forever.
    if (
      err instanceof PrismaClient.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await prisma.escalation.findUniqueOrThrow({
        where: { callLogId: call.id },
        select: escalationSelect,
      });
      return { escalation: winner, alreadyEscalated: true };
    }
    throw err;
  }
}

/** The escalation on a call, tenant-scoped. Null when the call was never flagged. */
export async function getEscalation(
  staff: ScopedStaff,
  callId: string,
): Promise<EscalationSummary | null> {
  return prisma.escalation.findFirst({
    where: { callLogId: callId, ...clinicWhere(staff) },
    select: escalationSelect,
  });
}

export class EscalationAlreadyClaimedError extends Error {
  constructor(message = "Escalation already claimed by another staff member.") {
    super(message);
    this.name = "EscalationAlreadyClaimedError";
  }
}

/**
 * Mark the escalation as taken and record who took it. Idempotent for the same
 * staff member (a double-click or a re-join returns their own claim); a
 * different staff member gets EscalationAlreadyClaimedError so two people don't
 * silently talk over each other on the same caller.
 *
 * A RESOLVED escalation is not claimable: staff marked it handled, the call is
 * long over, and its LiveKit room is empty. Re-claiming would silently
 * un-resolve the record and drop the receptionist into a dead room, so it is
 * refused instead — an old browser tab must not be able to resurrect closed work.
 */
export async function claimEscalation(
  staff: ScopedStaff & { id: string },
  callId: string,
): Promise<EscalationSummary> {
  const existing = await prisma.escalation.findFirst({
    where: { callLogId: callId, ...clinicWhere(staff) },
    select: { id: true, status: true, claimedByStaffId: true },
  });
  if (!existing) throw new Error("Unknown escalation");
  if (existing.status === "Resolved") {
    throw new EscalationAlreadyClaimedError(
      "This call was already marked as handled.",
    );
  }
  if (existing.claimedByStaffId && existing.claimedByStaffId !== staff.id) {
    throw new EscalationAlreadyClaimedError(
      "A colleague has already taken this call.",
    );
  }
  return prisma.escalation.update({
    where: { id: existing.id },
    data: {
      status: "Claimed",
      claimedByStaffId: staff.id,
      claimedAt: new Date(),
    },
    select: escalationSelect,
  });
}

/** Close the escalation out. Safe to call on an already-resolved escalation. */
export async function resolveEscalation(
  staff: ScopedStaff,
  callId: string,
): Promise<EscalationSummary> {
  const existing = await prisma.escalation.findFirst({
    where: { callLogId: callId, ...clinicWhere(staff) },
    select: { id: true },
  });
  if (!existing) throw new Error("Unknown escalation");
  return prisma.escalation.update({
    where: { id: existing.id },
    data: { status: "Resolved", resolvedAt: new Date() },
    select: escalationSelect,
  });
}
