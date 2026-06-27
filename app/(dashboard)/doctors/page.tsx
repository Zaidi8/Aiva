// Server-rendered shell for the doctors dashboard. Mirrors the patients route:
// enforce auth, read ?q=, fetch the first page server-side, and hand initial
// data to the DoctorsPage client component. Mutations call router.refresh()
// which re-invokes this server component.

import { requireStaff } from '@/lib/auth';
import { listDoctors } from '@/lib/doctors/queries';
import { DoctorsPage } from '@/components/pages/DoctorsPage';

type SearchParams = Promise<{ q?: string }>;

export default async function DoctorsRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requireStaff();
  const { q } = await searchParams;
  const trimmedQuery = q?.trim() ?? '';

  const { items, total } = await listDoctors(staff, {
    q: trimmedQuery || undefined,
  });

  return (
    <DoctorsPage
      initialDoctors={items}
      initialTotal={total}
      initialQuery={trimmedQuery}
    />
  );
}
