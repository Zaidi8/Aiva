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
import { listPatients } from '@/lib/patients/queries';
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

  const { items, total } = await listPatients(staff, {
    q: trimmedQuery || undefined,
  });

  return (
    <PatientsPage
      initialPatients={items}
      initialTotal={total}
      initialQuery={trimmedQuery}
    />
  );
}
