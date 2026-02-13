'use client';

import { NewSidebar } from '@/components/layout/NewSidebar';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Map pathname to PageType
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

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#F7F9FB]">
      <NewSidebar
        currentPage={getCurrentPage() as any}
        onNavigate={handleNavigate as any}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
