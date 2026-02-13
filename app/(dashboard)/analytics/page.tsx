'use client';

import { NewAnalyticsPage } from '@/components/pages/NewAnalyticsPage';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewAnalyticsPage onNavigate={handleNavigate} />;
}
