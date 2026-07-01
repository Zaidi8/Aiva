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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TopBar } from '../ui/TopBar';
import { Textarea } from '../ui/textarea';
import { motion } from 'motion/react';
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

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="p-8 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Settings</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Settings ─────────────────────────────────────────── */}
          <TabsContent value="profile">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Your account</CardTitle>
                  <CardDescription>
                    These details are tied to your login. Email is managed via your
                    Supabase Auth account and can&apos;t be changed here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onAccountSubmit} className="space-y-6" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          aria-invalid={!!accountForm.formState.errors.fullName}
                          {...accountForm.register('fullName')}
                        />
                        {accountForm.formState.errors.fullName && (
                          <p className="text-xs text-red-600">
                            {accountForm.formState.errors.fullName.message}
                          </p>
                        )}
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
                        {accountForm.formState.errors.phone && (
                          <p className="text-xs text-red-600">
                            {accountForm.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          placeholder="Practice Manager"
                          {...accountForm.register('jobTitle')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          defaultValue={initialStaff.role}
                          disabled
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={accountSubmitting}
                      className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {accountSubmitting ? 'Saving...' : 'Save Account'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clinic information</CardTitle>
                  <CardDescription>
                    Update your clinic&apos;s public contact info. The voice phone is the
                    number patients dial to reach your AI receptionist.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onProfileSubmit} className="space-y-6" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="clinicName">Clinic Name</Label>
                      <Input
                        id="clinicName"
                        aria-invalid={!!profileForm.formState.errors.clinicName}
                        {...profileForm.register('clinicName')}
                      />
                      {profileForm.formState.errors.clinicName && (
                        <p className="text-xs text-red-600">
                          {profileForm.formState.errors.clinicName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="clinicPhone">Clinic Phone</Label>
                        <Input
                          id="clinicPhone"
                          aria-invalid={!!profileForm.formState.errors.clinicPhone}
                          {...profileForm.register('clinicPhone')}
                        />
                        {profileForm.formState.errors.clinicPhone && (
                          <p className="text-xs text-red-600">
                            {profileForm.formState.errors.clinicPhone.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clinicEmail">Clinic Email</Label>
                        <Input
                          id="clinicEmail"
                          type="email"
                          aria-invalid={!!profileForm.formState.errors.clinicEmail}
                          {...profileForm.register('clinicEmail')}
                        />
                        {profileForm.formState.errors.clinicEmail && (
                          <p className="text-xs text-red-600">
                            {profileForm.formState.errors.clinicEmail.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinicAddress">Clinic Address</Label>
                      <Textarea
                        id="clinicAddress"
                        rows={3}
                        aria-invalid={!!profileForm.formState.errors.clinicAddress}
                        {...profileForm.register('clinicAddress')}
                      />
                      {profileForm.formState.errors.clinicAddress && (
                        <p className="text-xs text-red-600">
                          {profileForm.formState.errors.clinicAddress.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinicVoicePhone">Voice Phone (inbound AI number)</Label>
                      {initialClinic.voicePhone && !voiceGoLiveReady && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Your AI number is set, but no doctor has working
                            hours yet — the receptionist can answer calls but
                            can’t book anyone. Add a doctor and set their
                            schedule to go fully live.
                          </span>
                        </div>
                      )}
                      <Input
                        id="clinicVoicePhone"
                        placeholder="e.g. +1 555 0100"
                        aria-invalid={!!profileForm.formState.errors.clinicVoicePhone}
                        {...profileForm.register('clinicVoicePhone')}
                      />
                      {profileForm.formState.errors.clinicVoicePhone && (
                        <p className="text-xs text-red-600">
                          {profileForm.formState.errors.clinicVoicePhone.message}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-500">
                        Leave blank until you&apos;ve provisioned a phone number for the
                        AI receptionist.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={profileSubmitting}
                      className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {profileSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Notifications Settings (UI-only, no backend yet) ─────────── */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Coming soon. These toggles aren&apos;t persisted yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { label: 'New Appointments', description: 'Get notified when new appointments are booked', defaultChecked: true },
                    { label: 'Appointment Cancellations', description: 'Receive alerts for cancelled appointments', defaultChecked: true },
                    { label: 'AI Call Notifications', description: 'Notifications for AI receptionist call activity', defaultChecked: true },
                    { label: 'Daily Summary', description: 'Receive daily summary emails', defaultChecked: false },
                    { label: 'System Updates', description: 'Get notified about system updates and maintenance', defaultChecked: true },
                  ].map((setting, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-[#333333]">{setting.label}</p>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.defaultChecked} />
                    </div>
                  ))}
                  <Button onClick={handleNotYetImplemented} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Security Settings (UI-only) ──────────────────────────────── */}
          <TabsContent value="security">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Password updates aren&apos;t wired up yet. Use Supabase Auth
                    directly until this is connected.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <Button onClick={handleNotYetImplemented} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                    <div>
                      <p className="font-medium text-[#333333]">Enable 2FA</p>
                      <p className="text-sm text-gray-600">Secure your account with two-factor authentication</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── AI Settings ──────────────────────────────────────────────── */}
          <TabsContent value="ai">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>AI Receptionist Configuration</CardTitle>
                  <CardDescription>
                    Customize how the AI greets callers and which call actions it
                    can take on its own.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onAiSubmit} className="space-y-6" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="ai-name">AI Assistant Name</Label>
                      <Input
                        id="ai-name"
                        aria-invalid={!!aiForm.formState.errors.agentName}
                        {...aiForm.register('agentName')}
                      />
                      {aiForm.formState.errors.agentName && (
                        <p className="text-xs text-red-600">
                          {aiForm.formState.errors.agentName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="greeting">Greeting Message</Label>
                      <Textarea
                        id="greeting"
                        rows={3}
                        aria-invalid={!!aiForm.formState.errors.greetingMessage}
                        {...aiForm.register('greetingMessage')}
                      />
                      {aiForm.formState.errors.greetingMessage && (
                        <p className="text-xs text-red-600">
                          {aiForm.formState.errors.greetingMessage.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: 'autoBook' as const, label: 'Auto-Book Appointments', description: 'Allow AI to automatically book appointments' },
                        { key: 'sendConfirmations' as const, label: 'Send Confirmations', description: 'Automatically send appointment confirmations' },
                        { key: 'handleRescheduling' as const, label: 'Handle Rescheduling', description: 'Let AI manage appointment rescheduling' },
                        { key: 'emergencyTransfer' as const, label: 'Emergency Transfers', description: 'Transfer emergency cases to staff immediately' },
                      ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-[#333333]">{setting.label}</p>
                            <p className="text-sm text-gray-600">{setting.description}</p>
                          </div>
                          <Switch
                            checked={!!aiForm.watch(setting.key)}
                            onCheckedChange={(checked) =>
                              aiForm.setValue(setting.key, checked, { shouldDirty: true })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      type="submit"
                      disabled={aiSubmitting}
                      className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {aiSubmitting ? 'Saving...' : 'Save AI Settings'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Appearance Settings (UI-only) ────────────────────────────── */}
          <TabsContent value="appearance">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Display</CardTitle>
                  <CardDescription>
                    Coming soon. These toggles aren&apos;t persisted yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Dark Mode', description: 'Enable dark mode for better viewing in low light', defaultChecked: false },
                      { label: 'Compact View', description: 'Show more information in less space', defaultChecked: false },
                      { label: 'Animations', description: 'Enable smooth transitions and animations', defaultChecked: true },
                    ].map((setting, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-[#333333]">{setting.label}</p>
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        </div>
                        <Switch defaultChecked={setting.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleNotYetImplemented} className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Appearance
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
