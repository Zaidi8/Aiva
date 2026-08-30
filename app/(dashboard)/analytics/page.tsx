// Server-rendered shell for the Analytics page. Fetches the default-range
// payload server-side; the client component refetches only when the user
// switches range. analytics/loading.tsx streams a chart skeleton meanwhile.
// Admin-only (Analytics is the admin business view).

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getAnalytics } from '@/lib/analytics/queries';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';

export default async function AnalyticsRoute() {
  const staff = await requireStaff();
  if (!can(staff.role, 'analytics:read')) redirect('/dashboard');
  const data = await getAnalytics(staff, 'this-month');

  return <AnalyticsPage initialData={data} />;
}
