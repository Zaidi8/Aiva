// Server-rendered shell for the Team page. Admin-only: other roles are
// redirected to the dashboard (the /api/staff routes enforce this too).

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { listStaff } from '@/lib/staff/queries';
import { TeamPage } from '@/components/pages/TeamPage';

export default async function TeamRoute() {
  const staff = await requireStaff();
  if (!can(staff.role, 'team:manage')) redirect('/dashboard');

  const items = await listStaff(staff);

  return (
    <TeamPage
      initialStaff={items}
      currentStaffId={staff.id}
      isAdmin={staff.role === 'Admin'}
    />
  );
}
