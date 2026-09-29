// Staff view for taking over a live escalated call.
//
// GET /ai-receptionist/live/[callId]
//
// The page itself holds no secrets: JoinCallPage asks the server for a
// room-scoped token over POST /api/calls/[id]/join and then connects with the
// browser LiveKit client. Nothing joinable is embedded in the URL, so the token
// can never leak through history, referrers, or a shared link.
//
// It lives inside the (dashboard) group, so it inherits the usual shell — a
// receptionist can still navigate away, and the sidebar carries their profile.
// The takeover UI is deliberately plain regardless: during a live call this
// window is competing with the caller for attention, not a place for navigation.
//
// Requires `call:read` — Admin + Receptionist, same as the AI Receptionist page
// the receptionist came from. Note the edge proxy only guards /dashboard and
// /onboarding, so this requireStaff() call is the actual access check.

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getCall } from '@/lib/calls/queries';
import { getEscalation } from '@/lib/calls/escalations';
import { JoinCallPage } from '@/components/pages/JoinCallPage';

export default async function JoinCallRoute({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const staff = await requireStaff();
  if (!can(staff.role, 'call:read')) redirect('/dashboard');

  const { callId } = await params;
  const call = await getCall(staff, callId);
  // A call that isn't ours (or doesn't exist) is a 404 in spirit; the client
  // page shows the message, which keeps this route free of throwaway UI.
  const escalation = await getEscalation(staff, callId);

  return (
    <JoinCallPage
      callId={callId}
      callerName={call?.patient?.fullName ?? call?.patientPhone ?? 'Unknown caller'}
      callerPhone={call?.patientPhone ?? null}
      roomName={escalation?.roomName ?? null}
      escalationStatus={escalation?.status ?? null}
    />
  );
}
