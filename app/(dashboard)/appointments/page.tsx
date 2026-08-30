// Server-rendered shell for the Appointments dashboard.
//
// Fetches the first page of appointments (≤100 rows) for the caller's clinic.
// Tile counts (confirmed/pending) are computed in JS over the same page so
// we don't waterfall three count() queries. Anything interactive
// (search/filter/calendar selection, the New Appointment modal) lives inside
// the client component, which re-runs this server route via router.refresh()
// after a mutation.

import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { listAppointments } from '@/lib/appointments/queries';
import { doctorScope } from '@/lib/role-scope';
import { AppointmentsPage } from '@/components/pages/AppointmentsPage';

export default async function AppointmentsRoute() {
  const staff = await requireStaff();
  const scope = doctorScope(staff);
  const scopeDoctorId = scope.limited ? scope.doctorId ?? undefined : undefined;
  const canWrite = can(staff.role, 'appointment:write');

  // Doctor logins are pinned to their own schedule; a Doctor with no linked
  // Doctor row sees an empty page rather than the whole clinic.
  if (scope.limited && !scopeDoctorId) {
    return (
      <AppointmentsPage
        initialAppointments={[]}
        initialTotals={{ total: 0, confirmed: 0, pending: 0 }}
        canWrite={canWrite}
      />
    );
  }

  const { items, total } = await listAppointments(staff, {
    take: 100,
    doctorId: scopeDoctorId,
  });

  const confirmed = items.filter((a) => a.status === 'Confirmed').length;
  const pending = items.filter((a) => a.status === 'Pending').length;

  return (
    <AppointmentsPage
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
        canWrite={canWrite}
      />
  );
}
