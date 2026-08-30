'use client';

import { NewSidebar, type SidebarUserProfile } from '@/components/layout/NewSidebar';
import { usePathname } from 'next/navigation';
import type { PageType } from '@/types';

export function DashboardShell({
  userProfile,
  children,
}: {
  userProfile: SidebarUserProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Active-nav highlight derives from the URL; the sidebar itself navigates via
  // <Link> (prefetched), so the persistent shell never re-renders on nav.
  const getCurrentPage = (): string => {
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/appointments')) return 'appointments';
    if (pathname.includes('/patients')) return 'patients';
    if (pathname.includes('/doctors')) return 'doctors';
    if (pathname.includes('/team')) return 'team';
    if (pathname.includes('/ai-receptionist')) return 'ai-receptionist';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/ui-kit')) return 'ui-kit';
    return 'dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NewSidebar
        currentPage={getCurrentPage() as PageType}
        userProfile={userProfile}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
