// Server-rendered shell for the Team page. Admins manage clinic logins; other
// roles see a friendly "admins only" notice (the API enforces this too).

import { requireStaff } from '@/lib/auth';
import { listStaff } from '@/lib/staff/queries';
import { TeamPage } from '@/components/pages/TeamPage';

export default async function TeamRoute() {
  const staff = await requireStaff();
  const isAdmin = staff.role === 'Admin';

  // Non-admins don't get the roster; the page renders the gated notice.
  const items = isAdmin ? await listStaff(staff) : [];

  return (
    <TeamPage
      initialStaff={items}
      currentStaffId={staff.id}
      isAdmin={isAdmin}
    />
  );
}
