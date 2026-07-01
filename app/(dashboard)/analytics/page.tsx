// Server-rendered shell for the Analytics page. Fetches the default-range
// payload server-side; the client component refetches only when the user
// switches range. analytics/loading.tsx streams a chart skeleton meanwhile.

import { requireStaff } from '@/lib/auth';
import { getAnalytics } from '@/lib/analytics/queries';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';

export default async function AnalyticsRoute() {
  const staff = await requireStaff();
  const data = await getAnalytics(staff, 'this-month');

  return <AnalyticsPage initialData={data} />;
}
