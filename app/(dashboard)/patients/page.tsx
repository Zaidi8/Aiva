// Server-rendered shell for the patients dashboard.
//
// Responsibilities:
//   1. Enforce auth via requireStaff() (the dashboard proxy already gates the
//      route, but requireStaff guarantees a non-null staff for tenant scoping).
//   2. Read `?q=` from the URL so deep-links to filtered views work.
//   3. Fetch the first page of patients server-side and pass to the client
//      component as initial state. Subsequent mutations call router.refresh()
//      from the client to re-invoke this server component.
//
// Anything interactive (search input debounce, modal toggles, form state)
// stays inside the PatientsPage client component, which is 'use client'.

import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { listPatients } from '@/lib/patients/queries';
import { doctorScope } from '@/lib/role-scope';
import { PatientsPage } from '@/components/pages/PatientsPage';

// Next.js 15+ provides searchParams as a Promise.
type SearchParams = Promise<{ q?: string }>;

export default async function PatientsRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requireStaff();
  const { q } = await searchParams;
  const trimmedQuery = q?.trim() ?? '';
  const scope = doctorScope(staff);
  const scopeDoctorId = scope.limited ? scope.doctorId ?? undefined : undefined;
  const canWrite = can(staff.role, 'patient:write');

  // Doctor logins only see patients they've treated (linked via their own
  // appointments). A Doctor with no linked row sees an empty list.
  if (scope.limited && !scopeDoctorId) {
    return <PatientsPage initialPatients={[]} initialTotal={0} initialQuery={trimmedQuery} canWrite={canWrite} />;
  }

  const { items, total } = await listPatients(staff, {
    q: trimmedQuery || undefined,
    doctorId: scopeDoctorId,
  });

  return (
    <PatientsPage
      initialPatients={items}
      initialTotal={total}
      initialQuery={trimmedQuery}
      canWrite={canWrite}
    />
  );
}
