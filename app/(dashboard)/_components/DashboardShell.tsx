'use client';

import { NewSidebar, type SidebarUserProfile } from '@/components/layout/NewSidebar';
import { useRouter, usePathname } from 'next/navigation';
import type { PageType } from '@/types';

export function DashboardShell({
  userProfile,
  children,
}: {
  userProfile: SidebarUserProfile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentPage = (): string => {
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/appointments')) return 'appointments';
    if (pathname.includes('/patients')) return 'patients';
    if (pathname.includes('/ai-receptionist')) return 'ai-receptionist';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/ui-kit')) return 'ui-kit';
    return 'dashboard';
  };

  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F9FB]">
      <NewSidebar
        currentPage={getCurrentPage() as PageType}
        onNavigate={handleNavigate as (page: PageType, subPage?: string) => void}
        userProfile={userProfile}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
