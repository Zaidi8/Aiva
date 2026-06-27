// Standalone post-signup onboarding flow (no dashboard chrome). A new clinic
// lands here straight from registration to set up clinic details, a first
// doctor + hours, and optionally invite the team — then continues to the
// dashboard. Auth-gated by requireStaff() (and /onboarding is in the edge
// proxy's protected prefixes).

import { requireStaff } from '@/lib/auth';
import { getClinic } from '@/lib/clinics/queries';
import { OnboardingWizard } from '@/components/pages/OnboardingWizard';

export default async function OnboardingRoute() {
  const staff = await requireStaff();
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
