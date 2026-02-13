'use client';

import { ImprovedAppointmentsPage } from '@/components/pages/ImprovedAppointmentsPage';
import { useRouter } from 'next/navigation';

export default function AppointmentsPage() {
  const router = useRouter();

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <ImprovedAppointmentsPage onNavigate={handleNavigate} />;
}
