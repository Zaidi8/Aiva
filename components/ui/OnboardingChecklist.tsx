'use client';

// Dashboard setup guide for new clinics. Reads the setup signals from the
// existing /api/dashboard-summary payload (no extra fetch) and renders the
// remaining steps with a CTA each. Auto-hides once every step is complete.

import { motion } from 'motion/react';
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
import { Card, CardContent } from './card';
import { Button } from './button';

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
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-xl text-[#333333]">Finish setting up your clinic</h2>
            <span className="text-sm text-gray-500">
              {completed} of {steps.length} done
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            A few quick steps and your AI receptionist is ready to take calls.
          </p>

          {/* progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-100 mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl p-3 transition-colors ${
                  step.done ? 'bg-[#27AE60]/5' : 'bg-[#F7F9FB] hover:bg-gray-100'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-6 h-6 text-[#27AE60] flex-shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                )}
                <step.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    step.done ? 'text-[#27AE60]' : 'text-[#2F80ED]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done
                        ? 'text-gray-400 line-through'
                        : 'text-[#333333]'
                    }`}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-gray-500">{step.hint}</p>
                  )}
                </div>
                {!step.done && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-[#2F80ED] hover:text-white transition-all flex-shrink-0"
                    onClick={step.go}
                  >
                    {step.cta}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
