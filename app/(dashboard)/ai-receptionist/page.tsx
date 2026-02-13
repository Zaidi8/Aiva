'use client';

import { NewAIReceptionistPage } from '@/components/pages/NewAIReceptionistPage';
import { useRouter } from 'next/navigation';

export default function AIReceptionistPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewAIReceptionistPage onNavigate={handleNavigate} />;
}
