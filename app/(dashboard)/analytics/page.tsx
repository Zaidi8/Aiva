'use client';

import { AnalyticsPage } from '@/components/pages/AnalyticsPage';
import { useRouter } from 'next/navigation';

export default function AnalyticsRoute() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <AnalyticsPage onNavigate={handleNavigate} />;
}
