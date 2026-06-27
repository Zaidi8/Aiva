'use client';

// Guided post-signup onboarding. Three steps — clinic details, a first doctor
// with working hours, and an optional team invite — then off to the dashboard.
// Each step writes through the same REST endpoints the dashboard uses, so the
// dashboard's setup checklist reflects progress made here.

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Stethoscope,
  UsersRound,
  ArrowRight,
  ArrowLeft,
  Check,
  PartyPopper,
} from 'lucide-react';
import { AivaLogo } from '../ui/AivaLogo';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AddTeamMemberModal } from '../ui/AddTeamMemberModal';
import { cn } from '../ui/utils';
import { apiPatch, apiPost, apiPut, ApiError } from '@/lib/client/fetcher';

interface InitialClinic {
  name: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
}

interface OnboardingWizardProps {
  staffName: string;
  initialClinic: InitialClinic;
}

const STEPS = [
  { key: 'clinic', label: 'Clinic details', icon: Building2 },
  { key: 'doctor', label: 'First doctor', icon: Stethoscope },
  { key: 'team', label: 'Invite team', icon: UsersRound },
];

const TIMEZONES = [
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Riyadh',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_OPTIONS = [15, 20, 30, 45, 60];

// Brand-blue checked state (shadcn default --primary is near-black).
const CHECKBOX_BRAND = {
  backgroundColor: '#2F80ED',
  borderColor: '#2F80ED',
  color: '#ffffff',
} as const;

export function OnboardingWizard({
  staffName,
  initialClinic,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1 — clinic details
  const [clinic, setClinic] = useState(initialClinic);
  const [clinicErrors, setClinicErrors] = useState<Record<string, string>>({});

  // Step 2 — first doctor + hours
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState('');
  const [docDays, setDocDays] = useState<boolean[]>([
    false,
    true,
    true,
    true,
    true,
    true,
    false,
  ]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slot, setSlot] = useState(30);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  // Step 3 — team
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedCount, setInvitedCount] = useState(0);

  // Greet by first name, skipping a leading honorific so "Dr. Sara Khan"
  // greets "Sara", not "Dr.".
  const firstName = (() => {
    const parts = staffName.trim().split(/\s+/);
    const isTitle = /^(dr|mr|mrs|ms|miss|prof|sir)\.?$/i;
    const name = isTitle.test(parts[0]) ? parts[1] : parts[0];
    return name || staffName;
  })();

  const goDashboard = () => {
    // Full reload so the dashboard server components re-read fresh data.
    window.location.assign('/dashboard');
  };

  // ── Step 1: clinic details ──────────────────────────────────────────────
  const saveClinic = async () => {
    setClinicErrors({});
    setBusy(true);
    try {
      await apiPatch('/api/clinic', {
        name: clinic.name.trim(),
        phone: clinic.phone.trim(),
        email: clinic.email.trim(),
        address: clinic.address.trim(),
        timezone: clinic.timezone,
      });
      setStep(1);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fields)) next[k] = v[0];
        setClinicErrors(next);
        toast.error('Please fix the highlighted fields.');
      } else {
        toast.error(e instanceof ApiError ? e.message : 'Could not save clinic.');
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2: first doctor + working hours ────────────────────────────────
  const saveDoctor = async () => {
    setDocErrors({});
    const errors: Record<string, string> = {};
    if (!docName.trim()) errors.name = 'Enter the doctor’s name.';
    if (!docSpec.trim()) errors.specialization = 'Enter a specialization.';
    if (!docDays.some(Boolean)) errors.days = 'Pick at least one working day.';
    if (startTime >= endTime) errors.time = 'End time must be after start time.';
    if (Object.keys(errors).length) {
      setDocErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const doctor = await apiPost<{ id: string }>('/api/doctors', {
        name: docName.trim(),
        specialization: docSpec.trim(),
      });
      const days = docDays
        .map((on, dayOfWeek) => ({ on, dayOfWeek }))
        .filter((d) => d.on)
        .map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime,
          endTime,
          slotDurationMinutes: slot,
        }));
      await apiPut(`/api/doctors/${doctor.id}/schedule`, { days });
      toast.success(`${docName.trim()} added with working hours.`);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not add doctor.');
    } finally {
      setBusy(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FB] to-[#EAF2FE] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <AivaLogo className="w-12 h-12 mb-3" />
          <h1 className="text-2xl font-semibold text-[#333333]">
            Welcome to Aiva, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Let’s get your clinic ready to take calls — this takes about a
            minute.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
                    active && 'bg-[#2F80ED] text-white',
                    done && 'bg-[#2F80ED]/10 text-[#2F80ED]',
                    !active && !done && 'bg-white text-gray-400 border',
                  )}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <s.icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-5',
                      i < step ? 'bg-[#2F80ED]' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1 text-[#2F80ED]">
            <currentStep.icon className="w-5 h-5" />
            <h2 className="text-lg font-medium text-[#333333]">
              {currentStep.label}
            </h2>
          </div>

          {/* Step 1 — Clinic details */}
          {step === 0 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-500">
                These appear on patient confirmations and set the timezone all
                scheduling runs in.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="clinicName">Clinic name</Label>
                <Input
                  id="clinicName"
                  value={clinic.name}
                  onChange={(e) =>
                    setClinic({ ...clinic, name: e.target.value })
                  }
                  aria-invalid={!!clinicErrors.name}
                />
                {clinicErrors.name && (
                  <p className="text-xs text-red-600">{clinicErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clinicPhone">Phone</Label>
                  <Input
                    id="clinicPhone"
                    placeholder="+92 300 1234567"
                    value={clinic.phone}
                    onChange={(e) =>
                      setClinic({ ...clinic, phone: e.target.value })
                    }
                    aria-invalid={!!clinicErrors.phone}
                  />
                  {clinicErrors.phone && (
                    <p className="text-xs text-red-600">{clinicErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clinicEmail">Email</Label>
                  <Input
                    id="clinicEmail"
                    type="email"
                    placeholder="contact@clinic.com"
                    value={clinic.email}
                    onChange={(e) =>
                      setClinic({ ...clinic, email: e.target.value })
                    }
                    aria-invalid={!!clinicErrors.email}
                  />
                  {clinicErrors.email && (
                    <p className="text-xs text-red-600">{clinicErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clinicAddress">Address</Label>
                <Textarea
                  id="clinicAddress"
                  rows={2}
                  placeholder="123 Main St, Karachi"
                  value={clinic.address}
                  onChange={(e) =>
                    setClinic({ ...clinic, address: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tz">Timezone</Label>
                <Select
                  value={clinic.timezone}
                  onValueChange={(v) => setClinic({ ...clinic, timezone: v })}
                >
                  <SelectTrigger id="tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2 — First doctor */}
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-500">
                Add one doctor and their weekly hours so patients (and the AI
                receptionist) can start booking. You can add more later.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="docName">Doctor name</Label>
                  <Input
                    id="docName"
                    placeholder="Dr. Sara Khan"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    aria-invalid={!!docErrors.name}
                  />
                  {docErrors.name && (
                    <p className="text-xs text-red-600">{docErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="docSpec">Specialization</Label>
                  <Input
                    id="docSpec"
                    placeholder="General Physician"
                    value={docSpec}
                    onChange={(e) => setDocSpec(e.target.value)}
                    aria-invalid={!!docErrors.specialization}
                  />
                  {docErrors.specialization && (
                    <p className="text-xs text-red-600">
                      {docErrors.specialization}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <label
                      key={d}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors',
                        docDays[i]
                          ? 'border-[#2F80ED] bg-[#2F80ED]/5 text-[#333333]'
                          : 'border-gray-200 text-gray-500',
                      )}
                    >
                      <Checkbox
                        className="border-gray-300"
                        style={docDays[i] ? CHECKBOX_BRAND : undefined}
                        checked={docDays[i]}
                        onCheckedChange={(v) =>
                          setDocDays((prev) =>
                            prev.map((p, idx) => (idx === i ? !!v : p)),
                          )
                        }
                      />
                      {d}
                    </label>
                  ))}
                </div>
                {docErrors.days && (
                  <p className="text-xs text-red-600">{docErrors.days}</p>
                )}
              </div>

              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <Label htmlFor="start">Start</Label>
                  <Input
                    id="start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-[130px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">End</Label>
                  <Input
                    id="end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-[130px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slot">Slot length</Label>
                  <Select
                    value={String(slot)}
                    onValueChange={(v) => setSlot(Number(v))}
                  >
                    <SelectTrigger id="slot" className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {docErrors.time && (
                <p className="text-xs text-red-600">{docErrors.time}</p>
              )}
            </div>
          )}

          {/* Step 3 — Invite team */}
          {step === 2 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-500">
                Give colleagues their own dashboard login. This is optional —
                you can always invite people later from the Team page.
              </p>

              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <UsersRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                {invitedCount > 0 ? (
                  <p className="text-sm text-[#27AE60] font-medium">
                    {invitedCount} team member
                    {invitedCount > 1 ? 's' : ''} invited ✓
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">
                    No one invited yet.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => setInviteOpen(true)}
                >
                  <UsersRound className="w-4 h-4 mr-2" />
                  Invite a team member
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 mt-8">
            <div>
              {step > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={busy}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  disabled={busy}
                  className="text-gray-500"
                >
                  Skip for now
                </Button>
              )}
              {step === 2 && (
                <Button
                  variant="ghost"
                  onClick={goDashboard}
                  className="text-gray-500"
                >
                  Skip
                </Button>
              )}

              {step === 0 && (
                <Button
                  onClick={saveClinic}
                  disabled={busy}
                  className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90"
                >
                  {busy ? 'Saving…' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 1 && (
                <Button
                  onClick={saveDoctor}
                  disabled={busy}
                  className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90"
                >
                  {busy ? 'Adding…' : 'Add doctor'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 2 && (
                <Button
                  onClick={goDashboard}
                  className="bg-gradient-to-r from-[#27AE60] to-[#2F80ED] hover:opacity-90"
                >
                  <PartyPopper className="w-4 h-4 mr-2" />
                  Go to dashboard
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can finish any of this later from your dashboard.
        </p>
      </div>

      <AddTeamMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => setInvitedCount((c) => c + 1)}
      />
    </div>
  );
}
