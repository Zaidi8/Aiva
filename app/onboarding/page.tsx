// Standalone post-signup onboarding flow (no dashboard chrome). A new clinic
// lands here straight from registration to set up clinic details, a first
// doctor + hours, and optionally invite the team — then continues to the
// dashboard. Auth-gated by requireStaff() (and /onboarding is in the edge
// proxy's protected prefixes).

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { getClinic } from '@/lib/clinics/queries';
import { listDoctors } from '@/lib/doctors/queries';
import { OnboardingWizard } from '@/components/pages/OnboardingWizard';

export default async function OnboardingRoute() {
  const staff = await requireStaff();

  // Onboarding is a one-time flow. Once the clinic has a doctor it has moved
  // past the critical setup step; revisiting /onboarding (it's linkable and
  // step 2 always POSTs) would create duplicate doctors — so send already-set-up
  // clinics to the dashboard, where doctors/team are managed normally.
  const doctors = await listDoctors(staff, { take: 1 });
  if (doctors.total > 0) redirect('/dashboard');

  const clinic = await getClinic(staff);

  return (
    <OnboardingWizard
      staffName={staff.fullName}
      initialClinic={{
        name: clinic?.name ?? '',
        phone: clinic?.phone ?? '',
        email: clinic?.email ?? '',
        address: clinic?.address ?? '',
        timezone: clinic?.timezone ?? 'Asia/Karachi',
      }}
    />
  );
}
