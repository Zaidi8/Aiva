'use client';

import { NewUIKitPage } from '@/components/pages/NewUIKitPage';
import { useRouter } from 'next/navigation';

export default function UIKitPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewUIKitPage onNavigate={handleNavigate} />;
}
