'use client';

import { NewSettingsPage } from '@/components/pages/NewSettingsPage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewSettingsPage onNavigate={handleNavigate} initialTab={initialTab} />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
