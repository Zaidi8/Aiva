'use client';

import { AIReceptionistPage } from '@/components/pages/AIReceptionistPage';
import { useRouter } from 'next/navigation';

export default function AIReceptionistRoute() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <AIReceptionistPage onNavigate={handleNavigate} />;
}
