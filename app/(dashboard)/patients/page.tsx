'use client';

import { NewPatientsPage } from '@/components/pages/NewPatientsPage';
import { useRouter } from 'next/navigation';

export default function PatientsPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <NewPatientsPage onNavigate={handleNavigate} />;
}
