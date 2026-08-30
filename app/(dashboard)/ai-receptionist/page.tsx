// Server-rendered shell for the AI Receptionist page. Fetches the call list +
// today's summary server-side (sequentially — the pooled DB is
// connection_limit=1) and hands them to the client component as initial state.
// While this runs, ai-receptionist/loading.tsx streams a layout-matched skeleton.
// Visible to Admin + Receptionist (call logs are staff-operational data).

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { listCalls } from '@/lib/calls/queries';
import { getDashboardSummary } from '@/lib/dashboard/queries';
import { AIReceptionistPage } from '@/components/pages/AIReceptionistPage';

export default async function AIReceptionistRoute() {
  const staff = await requireStaff();
  if (!can(staff.role, 'call:read')) redirect('/dashboard');
  const calls = await listCalls(staff, { take: 50 });
  const summary = await getDashboardSummary(staff);

  // Map Date → ISO strings so the payload matches what the client component
  // used to receive from the /api/calls JSON (and stays serializable).
  const initialCalls = calls.items.map((c) => ({
    id: c.id,
    patientPhone: c.patientPhone,
    durationSec: c.durationSec,
    detectedIntent: c.detectedIntent,
    outcome: c.outcome,
    transcript: c.transcript,
    sentiment: c.sentiment,
    startedAt: c.startedAt.toISOString(),
    endedAt: c.endedAt ? c.endedAt.toISOString() : null,
    patient: c.patient ? { id: c.patient.id, fullName: c.patient.fullName } : null,
  }));

  return (
    <AIReceptionistPage
      initialCalls={initialCalls}
      initialSummary={{
        callsHandledToday: summary.callsHandledToday,
        bookingsMadeToday: summary.bookingsMadeToday,
        successRate: summary.successRate,
      }}
    />
  );
}
