'use client';

// Dashboard setup guide for new clinics. Reads the setup signals from the
// existing /api/dashboard-summary payload (no extra fetch) and renders the
// remaining steps with a CTA each. Auto-hides once every step is complete.

import {
  Stethoscope,
  CalendarClock,
  Users,
  UserPlus,
  Phone,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import { SectionCard } from './section-card';
import { Button } from './button';
import { cn } from './utils';

interface OnboardingChecklistProps {
  doctorCount: number;
  scheduledDoctorCount: number;
  patientCount: number;
  staffCount: number;
  aiConfigured: boolean;
  onNavigate?: (page: string, subPage?: string) => void;
}

export function OnboardingChecklist({
  doctorCount,
  scheduledDoctorCount,
  patientCount,
  staffCount,
  aiConfigured,
  onNavigate,
}: OnboardingChecklistProps) {
  const steps = [
    {
      icon: Stethoscope,
      label: 'Add your first doctor',
      hint: 'Doctors are who patients book with.',
      done: doctorCount > 0,
      cta: 'Add doctor',
      go: () => onNavigate?.('doctors'),
    },
    {
      icon: CalendarClock,
      label: 'Set working hours',
      hint: 'Weekly hours power booking and the AI receptionist.',
      done: scheduledDoctorCount > 0,
      cta: 'Set hours',
      go: () => onNavigate?.('doctors'),
    },
    {
      icon: Users,
      label: 'Add a patient',
      hint: 'Build your patient list, or let the AI add callers.',
      done: patientCount > 0,
      cta: 'Add patient',
      go: () => onNavigate?.('patients'),
    },
    {
      icon: UserPlus,
      label: 'Invite your team',
      hint: 'Give colleagues their own dashboard login.',
      done: staffCount > 1,
      cta: 'Invite',
      go: () => onNavigate?.('team'),
    },
    {
      icon: Phone,
      label: 'Connect your AI phone number',
      hint: 'Set the number patients dial to reach the AI receptionist.',
      done: aiConfigured,
      cta: 'Configure',
      go: () => onNavigate?.('settings', 'ai'),
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  // Auto-hide once fully set up — the dashboard reverts to its normal view.
  if (completed === steps.length) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <SectionCard
      title="Finish setting up your clinic"
      description="A few quick steps and your AI receptionist is ready to take calls."
      action={
        <span className="text-sm font-medium text-muted-foreground">
          {completed} of {steps.length} done
        </span>
      }
    >
      {/* progress bar */}
      <div
        className="mb-5 h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 rounded-lg p-3 transition-colors',
                step.done ? 'bg-success-muted/60' : 'bg-muted hover:bg-accent',
              )}
            >
              {step.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground/40" />
              )}
              <StepIcon
                className={cn(
                  'size-5 shrink-0',
                  step.done ? 'text-success' : 'text-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground',
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                )}
              </div>
              {!step.done && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={step.go}
                >
                  {step.cta}
                  <ArrowRight />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
