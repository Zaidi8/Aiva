// Server-rendered shell for the Dashboard. Reads the summary + today's
// appointments server-side (sequentially — the pooled DB is connection_limit=1)
// and passes them to the client page as initial state. dashboard/loading.tsx
// streams a layout-matched skeleton while these run.

import { requireStaff } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/dashboard/queries';
import { listAppointments } from '@/lib/appointments/queries';
import { DashboardPage } from '@/components/pages/DashboardPage';

function todayUtcBounds() {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from, to };
}

export default async function DashboardRoute() {
  const staff = await requireStaff();
  const { from, to } = todayUtcBounds();

  const summary = await getDashboardSummary(staff);
  const appts = await listAppointments(staff, { from, to, take: 4 });

  const initialTodayAppts = appts.items.slice(0, 4).map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status,
    type: a.type,
    patient: {
      id: a.patient.id,
      fullName: a.patient.fullName,
      phoneNumber: a.patient.phoneNumber,
    },
    doctor: {
      id: a.doctor.id,
      name: a.doctor.name,
      specialization: a.doctor.specialization,
    },
  }));

  return (
    <DashboardPage initialSummary={summary} initialTodayAppts={initialTodayAppts} />
  );
}
