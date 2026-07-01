// Server-rendered shell for the Settings dashboard.
//
// Responsibilities:
//   1. Enforce auth via requireStaff() — settings forms need a real session
//      so they can resolve the caller's clinic + ai-settings.
//   2. Fetch the three sources of truth (staff, clinic, aiSettings) in
//      parallel and hand them to the client tabs component as initial state.
//   3. Read `?tab=` from the URL so deep-links from the sidebar still land
//      on the right tab (Profile / AI / Notifications / Security / Appearance).
//
// All form state + PATCH plumbing lives in SettingsPage on the client.

import { Suspense } from 'react';
import { requireStaff } from '@/lib/auth';
import { getClinic } from '@/lib/clinics/queries';
import { hasBookableDoctor } from '@/lib/clinics/mutations';
import { getAiSettings } from '@/lib/ai-settings/queries';
import { updateAiSettings } from '@/lib/ai-settings/mutations';
import { SettingsPage } from '@/components/pages/SettingsPage';

type SearchParams = Promise<{ tab?: string }>;

async function SettingsPageContent({ tab }: { tab: string }) {
  const staff = await requireStaff();
  const [clinic, aiSettingsMaybe] = await Promise.all([
    getClinic(staff),
    getAiSettings(staff),
  ]);
  // Defensive bootstrap — register normally seeds AiSettings, but if a clinic
  // predates that flow we hydrate with defaults rather than crashing.
  const aiSettings = aiSettingsMaybe ?? (await updateAiSettings(staff, {}));
  // Go-live readiness drives the "voice on, but nothing bookable" warning.
  const voiceGoLiveReady = await hasBookableDoctor(staff);

  return (
    <SettingsPage
      initialTab={tab}
      initialStaff={{
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
        phone: staff.phone ?? '',
        jobTitle: staff.jobTitle ?? '',
      }}
      initialClinic={{
        name: clinic?.name ?? '',
        phone: clinic?.phone ?? '',
        email: clinic?.email ?? '',
        address: clinic?.address ?? '',
        voicePhone: clinic?.voicePhone ?? '',
        timezone: clinic?.timezone ?? '',
      }}
      initialAiSettings={{
        agentName: aiSettings.agentName,
        greetingMessage: aiSettings.greetingMessage,
        autoBook: aiSettings.autoBook,
        sendConfirmations: aiSettings.sendConfirmations,
        handleRescheduling: aiSettings.handleRescheduling,
        emergencyTransfer: aiSettings.emergencyTransfer,
      }}
      voiceGoLiveReady={voiceGoLiveReady}
    />
  );
}

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const initialTab = tab && tab.length > 0 ? tab : 'profile';
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading settings...</div>}>
      <SettingsPageContent tab={initialTab} />
    </Suspense>
  );
}
