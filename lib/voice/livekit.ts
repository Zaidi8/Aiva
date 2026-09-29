// Aiva — LiveKit access tokens for staff joining a live escalated call.
//
// There is no rented phone number or SIP trunk yet, so "escalate to a human"
// means a staff member joins the SAME LiveKit room as a new participant, from
// their browser, and talks to the caller directly. This module mints the token
// that lets them. When a SIP trunk is added later, ONLY the final handoff step
// changes (LiveKit's WarmTransferTask dials a real phone instead of a browser
// joining) — the escalation record, the webhook and the dashboard stay as-is.
//
// SECURITY: server-only. The API secret never leaves the server, and the room
// name it is scoped to comes from the Escalation row (tenant-scoped), never
// from the request. The token identity is namespaced `aiva-staff:<clinicStaffId>`
// so the Python agent can tell a staff member apart from the caller
// (see aiva-voice-agent/handoff.py).
//
// Credentials are read from the environment at call time, like lib/sms/textbee.ts,
// so Next.js never caches them into the client bundle in dev.

import "server-only";
import { AccessToken } from "livekit-server-sdk";

/** How long a staff member's join token stays valid. They join a live call — minutes, not hours. */
const TOKEN_TTL_S = 15 * 60;

export interface LivekitJoinCredentials {
  /** JWT to pass to room.connect(). */
  token: string;
  /** LiveKit WS URL. Returned (rather than read from NEXT_PUBLIC_*) so the
   *  browser needs no public env var. */
  url: string;
  roomName: string;
  /** Echoed back for logging / debugging on the join page. */
  identity: string;
}

/**
 * Mint a short-lived room-join token, or return null when LiveKit is not
 * configured on this deployment (local dev without a LiveKit project). Callers
 * turn null into a 503 with an actionable message rather than crashing.
 */
export async function createStaffJoinToken(args: {
  staffId: string;
  staffName: string;
  roomName: string;
}): Promise<LivekitJoinCredentials | null> {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;

  const identity = `aiva-staff:${args.staffId}`;
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: args.staffName,
    ttl: `${TOKEN_TTL_S}s`,
  });
  // Room join only. `canPublish` is what lets the staff member be HEARD by the
  // caller — without it a staff member joins mute, which would defeat the point.
  at.addGrant({
    room: args.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: await at.toJwt(),
    url,
    roomName: args.roomName,
    identity,
  };
}
