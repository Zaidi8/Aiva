// Server-rendered shell for the Appointments dashboard.
//
// Fetches the first page of appointments (≤100 rows) for the caller's clinic.
// Tile counts (confirmed/pending) are computed in JS over the same page so
// we don't waterfall three count() queries. Anything interactive
// (search/filter/calendar selection, the New Appointment modal) lives inside
// the client component, which re-runs this server route via router.refresh()
// after a mutation.

import { requireStaff } from '@/lib/auth';
import { listAppointments } from '@/lib/appointments/queries';
import { ImprovedAppointmentsPage } from '@/components/pages/ImprovedAppointmentsPage';

export default async function AppointmentsPage() {
  const staff = await requireStaff();
  const { items, total } = await listAppointments(staff, { take: 100 });

  const confirmed = items.filter((a) => a.status === 'Confirmed').length;
  const pending = items.filter((a) => a.status === 'Pending').length;

  return (
    <ImprovedAppointmentsPage
      initialAppointments={items.map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt.toISOString(),
        durationMin: a.durationMin,
        type: a.type,
        status: a.status,
        notes: a.notes,
        patient: a.patient,
        doctor: a.doctor,
      }))}
      initialTotals={{ total, confirmed, pending }}
    />
  );
}
