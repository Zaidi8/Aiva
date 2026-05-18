import { getCurrentStaff } from '@/lib/auth';
import { DashboardShell } from './_components/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts (Edge proxy) gates /dashboard/* — by the time we reach this layout
  // the Supabase session is verified. We just fetch the matching ClinicStaff row
  // for the sidebar profile.
  const staff = await getCurrentStaff();

  return (
    <DashboardShell
      userProfile={{
        name: staff?.fullName ?? '',
        role: staff?.role ?? '',
        email: staff?.email ?? '',
      }}
    >
      {children}
    </DashboardShell>
  );
}
