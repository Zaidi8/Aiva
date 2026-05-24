'use client';

import { DashboardPage } from '@/components/pages/DashboardPage';
import { useRouter } from 'next/navigation';

export default function DashboardRoute() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <DashboardPage onNavigate={handleNavigate} />;
}
