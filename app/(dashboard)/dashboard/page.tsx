'use client';

import { NewDashboardPage } from '@/components/pages/NewDashboardPage';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewDashboardPage onNavigate={handleNavigate} />;
}
