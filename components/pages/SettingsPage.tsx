'use client';

// Settings page. Five tabs:
//   • Profile — staff + clinic info, PATCH /api/clinic (clinic fields) only.
//                 Staff fields (name/phone/jobTitle) are read-only for now;
//                 there's no PATCH /api/staff/me endpoint yet, and editing
//                 your own role/email is owned by Supabase Auth.
//   • Notifications — UI-only toggles (no /api/staff/notification-preferences
//                 endpoint yet); preserved as a UI shell so the IA stays stable.
//                 Toggles persist in component state only.
//   • Security — UI shell for password change; the Save button surfaces a
//                 "not yet implemented" toast because Supabase Auth handles
//                 password updates and there's no /api/auth/password endpoint.
//   • AI Settings — live read/write against /api/ai-settings via react-hook-form.
//   • Appearance — UI-only toggles, same rationale as Notifications.
//
// We use react-hook-form for the Profile and AI tabs (the two with real API
// surface) and surface API 422 field errors via form.setError, mirroring the
// AddPatientModal pattern.

import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { User, Bell, Lock, Bot, Palette, Save, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TopBar } from '../ui/TopBar';
import { Textarea } from '../ui/textarea';
import { SectionCard } from '../ui/section-card';
import { apiPatch, ApiError } from '@/lib/client/fetcher';

interface InitialStaff {
  fullName: string;
  email: string;
  role: string;
  phone: string;
  jobTitle: string;
}
interface InitialClinic {
  name: string;
  phone: string;
  email: string;
  address: string;
  voicePhone: string;
  timezone: string;
}
interface InitialAiSettings {
  agentName: string;
  greetingMessage: string;
  autoBook: boolean;
  sendConfirmations: boolean;
  handleRescheduling: boolean;
  emergencyTransfer: boolean;
}

interface SettingsPageProps {
  initialTab?: string;
  initialStaff: InitialStaff;
  initialClinic: InitialClinic;
  initialAiSettings: InitialAiSettings;
  // False when the clinic has no active doctor with a schedule — used to warn
  // if the AI voice number is set but nothing is bookable yet.
  voiceGoLiveReady: boolean;
}

interface ProfileFormValues {
  fullName: string; // read-only
  email: string; // read-only
  phone: string; // read-only (staff phone, not clinic phone)
  clinicName: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicAddress: string;
  clinicVoicePhone: string;
}

interface AccountFormValues {
  fullName: string;
  phone: string;
  jobTitle: string;
}

type AiFormValues = InitialAiSettings;

// Small inline field error. Kept text-xs to stay compact under inputs.
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// A labelled switch row (used across Notifications, AI, Appearance, Security).
// `checked`/`onCheckedChange` drive the controlled AI rows; the UI-only tabs
// pass `defaultChecked` and leave it uncontrolled.
function ToggleRow({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export function SettingsPage({
  initialTab = 'profile',
  initialStaff,
  initialClinic,
  initialAiSettings,
  voiceGoLiveReady,
}: SettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ── Profile form (Clinic-side editable fields) ────────────────────────
  const profileForm = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: initialStaff.fullName,
      email: initialStaff.email,
      phone: initialStaff.phone,
      clinicName: initialClinic.name,
      clinicPhone: initialClinic.phone,
      clinicEmail: initialClinic.email,
      clinicAddress: initialClinic.address,
      clinicVoicePhone: initialClinic.voicePhone,
    },
    mode: 'onSubmit',
  });

  const onProfileSubmit = profileForm.handleSubmit(async (values) => {
    profileForm.clearErrors();
    try {
      await apiPatch('/api/clinic', {
        name: values.clinicName.trim(),
        phone: values.clinicPhone.trim(),
        email: values.clinicEmail.trim(),
        address: values.clinicAddress.trim(),
        voicePhone: values.clinicVoicePhone.trim(),
      });
      toast.success('Clinic profile saved.');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [apiKey, errs] of Object.entries(e.fields)) {
          const formKey: keyof ProfileFormValues | null =
            apiKey === 'name'
              ? 'clinicName'
              : apiKey === 'phone'
                ? 'clinicPhone'
                : apiKey === 'email'
                  ? 'clinicEmail'
                  : apiKey === 'address'
                    ? 'clinicAddress'
                    : apiKey === 'voicePhone'
                      ? 'clinicVoicePhone'
                      : null;
          if (formKey) {
            profileForm.setError(formKey, { message: errs[0] });
          }
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  // ── Account form (the caller's OWN staff profile) ─────────────────────
  // Separate from the clinic form: these PATCH /api/me, the clinic fields
  // PATCH /api/clinic. Email + role are not editable here.
  const accountForm = useForm<AccountFormValues>({
    defaultValues: {
      fullName: initialStaff.fullName,
      phone: initialStaff.phone,
      jobTitle: initialStaff.jobTitle,
    },
    mode: 'onSubmit',
  });

  const onAccountSubmit = accountForm.handleSubmit(async (values) => {
    accountForm.clearErrors();
    try {
      await apiPatch('/api/me', {
        fullName: values.fullName.trim(),
        phone: values.phone.trim() || undefined,
        jobTitle: values.jobTitle.trim() || undefined,
      });
      toast.success('Profile saved.');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [apiKey, errs] of Object.entries(e.fields)) {
          if (
            apiKey === 'fullName' ||
            apiKey === 'phone' ||
            apiKey === 'jobTitle'
          ) {
            accountForm.setError(apiKey, { message: errs[0] });
          }
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  // ── AI Settings form ───────────────────────────────────────────────────
  const aiForm = useForm<AiFormValues>({
    defaultValues: initialAiSettings,
    mode: 'onSubmit',
  });

  const onAiSubmit = aiForm.handleSubmit(async (values) => {
    aiForm.clearErrors();
    try {
      await apiPatch('/api/ai-settings', {
        agentName: values.agentName.trim(),
        greetingMessage: values.greetingMessage.trim(),
        autoBook: values.autoBook,
        sendConfirmations: values.sendConfirmations,
        handleRescheduling: values.handleRescheduling,
        emergencyTransfer: values.emergencyTransfer,
      });
      toast.success('AI receptionist settings saved.');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [apiKey, errs] of Object.entries(e.fields)) {
          if (apiKey in initialAiSettings) {
            aiForm.setError(apiKey as keyof AiFormValues, { message: errs[0] });
          }
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  const handleNotYetImplemented = () => {
    toast.info('This section is not connected yet.', {
      description: 'Coming in a future update.',
    });
  };

  const profileSubmitting = profileForm.formState.isSubmitting;
  const accountSubmitting = accountForm.formState.isSubmitting;
  const aiSubmitting = aiForm.formState.isSubmitting;

  const TABS = [
    { value: 'profile', label: 'Profile', icon: User },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'security', label: 'Security', icon: Lock },
    { value: 'ai', label: 'AI Settings', icon: Bot },
    { value: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div>
      <TopBar
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="mx-auto max-w-5xl p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-5">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex items-center gap-2"
              >
                <t.icon className="size-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Profile Settings ─────────────────────────────────────────── */}
          <TabsContent value="profile" className="space-y-6">
            <SectionCard
              title="Your account"
              description="These details are tied to your login. Email is managed via your Supabase Auth account and can’t be changed here."
            >
              <form onSubmit={onAccountSubmit} className="space-y-6" noValidate>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      aria-invalid={!!accountForm.formState.errors.fullName}
                      {...accountForm.register('fullName')}
                    />
                    <FieldError
                      message={accountForm.formState.errors.fullName?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={initialStaff.email}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="555-0101"
                      aria-invalid={!!accountForm.formState.errors.phone}
                      {...accountForm.register('phone')}
                    />
                    <FieldError
                      message={accountForm.formState.errors.phone?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input
                      id="jobTitle"
                      placeholder="Practice Manager"
                      {...accountForm.register('jobTitle')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue={initialStaff.role} disabled />
                  </div>
                </div>

                <Button type="submit" disabled={accountSubmitting}>
                  <Save />
                  {accountSubmitting ? 'Saving…' : 'Save account'}
                </Button>
              </form>
            </SectionCard>

            <SectionCard
              title="Clinic information"
              description="Update your clinic’s public contact info. The voice phone is the number patients dial to reach your AI receptionist."
            >
              <form onSubmit={onProfileSubmit} className="space-y-6" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic name</Label>
                  <Input
                    id="clinicName"
                    aria-invalid={!!profileForm.formState.errors.clinicName}
                    {...profileForm.register('clinicName')}
                  />
                  <FieldError
                    message={profileForm.formState.errors.clinicName?.message}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinicPhone">Clinic phone</Label>
                    <Input
                      id="clinicPhone"
                      aria-invalid={!!profileForm.formState.errors.clinicPhone}
                      {...profileForm.register('clinicPhone')}
                    />
                    <FieldError
                      message={profileForm.formState.errors.clinicPhone?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicEmail">Clinic email</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      aria-invalid={!!profileForm.formState.errors.clinicEmail}
                      {...profileForm.register('clinicEmail')}
                    />
                    <FieldError
                      message={profileForm.formState.errors.clinicEmail?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">Clinic address</Label>
                  <Textarea
                    id="clinicAddress"
                    rows={3}
                    aria-invalid={!!profileForm.formState.errors.clinicAddress}
                    {...profileForm.register('clinicAddress')}
                  />
                  <FieldError
                    message={profileForm.formState.errors.clinicAddress?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicVoicePhone">
                    Voice phone (inbound AI number)
                  </Label>
                  {initialClinic.voicePhone && !voiceGoLiveReady && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning-muted-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Your AI number is set, but no doctor has working hours
                        yet — the receptionist can answer calls but can’t book
                        anyone. Add a doctor and set their schedule to go fully
                        live.
                      </span>
                    </div>
                  )}
                  <Input
                    id="clinicVoicePhone"
                    placeholder="e.g. +1 555 0100"
                    aria-invalid={!!profileForm.formState.errors.clinicVoicePhone}
                    {...profileForm.register('clinicVoicePhone')}
                  />
                  <FieldError
                    message={
                      profileForm.formState.errors.clinicVoicePhone?.message
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank until you’ve provisioned a phone number for the
                    AI receptionist.
                  </p>
                </div>

                <Button type="submit" disabled={profileSubmitting}>
                  <Save />
                  {profileSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </form>
            </SectionCard>
          </TabsContent>

          {/* ── Notifications Settings (UI-only, no backend yet) ─────────── */}
          <TabsContent value="notifications" className="space-y-6">
            <SectionCard
              title="Notification preferences"
              description="Coming soon. These toggles aren’t persisted yet."
            >
              <div className="space-y-4">
                {[
                  { label: 'New appointments', description: 'Get notified when new appointments are booked', defaultChecked: true },
                  { label: 'Appointment cancellations', description: 'Receive alerts for cancelled appointments', defaultChecked: true },
                  { label: 'AI call notifications', description: 'Notifications for AI receptionist call activity', defaultChecked: true },
                  { label: 'Daily summary', description: 'Receive daily summary emails', defaultChecked: false },
                  { label: 'System updates', description: 'Get notified about system updates and maintenance', defaultChecked: true },
                ].map((setting) => (
                  <ToggleRow
                    key={setting.label}
                    label={setting.label}
                    description={setting.description}
                    defaultChecked={setting.defaultChecked}
                  />
                ))}
                <Button onClick={handleNotYetImplemented}>
                  <Save />
                  Save preferences
                </Button>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Security Settings (UI-only) ──────────────────────────────── */}
          <TabsContent value="security" className="space-y-6">
            <SectionCard
              title="Change password"
              description="Password updates aren’t wired up yet. Use Supabase Auth directly until this is connected."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button onClick={handleNotYetImplemented}>
                  <Save />
                  Update password
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              title="Two-factor authentication"
              description="Add an extra layer of security to your account."
            >
              <ToggleRow
                label="Enable 2FA"
                description="Secure your account with two-factor authentication"
              />
            </SectionCard>
          </TabsContent>

          {/* ── AI Settings ──────────────────────────────────────────────── */}
          <TabsContent value="ai" className="space-y-6">
            <SectionCard
              title="AI receptionist configuration"
              description="Customize how the AI greets callers and which call actions it can take on its own."
            >
              <form onSubmit={onAiSubmit} className="space-y-6" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="ai-name">AI assistant name</Label>
                  <Input
                    id="ai-name"
                    aria-invalid={!!aiForm.formState.errors.agentName}
                    {...aiForm.register('agentName')}
                  />
                  <FieldError
                    message={aiForm.formState.errors.agentName?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting message</Label>
                  <Textarea
                    id="greeting"
                    rows={3}
                    aria-invalid={!!aiForm.formState.errors.greetingMessage}
                    {...aiForm.register('greetingMessage')}
                  />
                  <FieldError
                    message={aiForm.formState.errors.greetingMessage?.message}
                  />
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'autoBook' as const, label: 'Auto-book appointments', description: 'Allow AI to automatically book appointments' },
                    { key: 'sendConfirmations' as const, label: 'Send confirmations', description: 'Automatically send appointment confirmations' },
                    { key: 'handleRescheduling' as const, label: 'Handle rescheduling', description: 'Let AI manage appointment rescheduling' },
                    { key: 'emergencyTransfer' as const, label: 'Emergency transfers', description: 'Transfer emergency cases to staff immediately' },
                  ].map((setting) => (
                    <ToggleRow
                      key={setting.key}
                      label={setting.label}
                      description={setting.description}
                      checked={!!aiForm.watch(setting.key)}
                      onCheckedChange={(checked) =>
                        aiForm.setValue(setting.key, checked, {
                          shouldDirty: true,
                        })
                      }
                    />
                  ))}
                </div>
                <Button type="submit" disabled={aiSubmitting}>
                  <Save />
                  {aiSubmitting ? 'Saving…' : 'Save AI settings'}
                </Button>
              </form>
            </SectionCard>
          </TabsContent>

          {/* ── Appearance Settings (UI-only) ────────────────────────────── */}
          <TabsContent value="appearance" className="space-y-6">
            <SectionCard
              title="Theme & display"
              description="Coming soon. These toggles aren’t persisted yet."
            >
              <div className="space-y-4">
                {[
                  { label: 'Dark mode', description: 'Enable dark mode for better viewing in low light', defaultChecked: false },
                  { label: 'Compact view', description: 'Show more information in less space', defaultChecked: false },
                  { label: 'Animations', description: 'Enable smooth transitions and animations', defaultChecked: true },
                ].map((setting) => (
                  <ToggleRow
                    key={setting.label}
                    label={setting.label}
                    description={setting.description}
                    defaultChecked={setting.defaultChecked}
                  />
                ))}
                <Button onClick={handleNotYetImplemented}>
                  <Save />
                  Save appearance
                </Button>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
