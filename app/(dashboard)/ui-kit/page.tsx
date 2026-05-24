'use client';

import { UIKitPage } from '@/components/pages/UIKitPage';
import { useRouter } from 'next/navigation';

export default function UIKitRoute() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <UIKitPage onNavigate={handleNavigate} />;
}
