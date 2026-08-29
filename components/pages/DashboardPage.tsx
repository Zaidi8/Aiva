'use client';

// Dashboard page (client component). Stat tiles + today's appointments are
// server-fetched by the route shell (app/(dashboard)/dashboard/page.tsx) and
// passed in as initial props — no client fetch-on-mount. router.refresh() after
// a mutation re-runs the server component to pull fresh data.

import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  XCircle,
  ThumbsUp,
  Bot,
  PhoneCall,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/button';
import { TopBar } from '../ui/TopBar';
import { StatCard } from '../ui/stat-card';
import { StatusBadge } from '../ui/status-badge';
import { SectionCard } from '../ui/section-card';
import { EmptyState } from '../ui/empty-state';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { AppointmentToast } from '../ui/AppointmentToast';
import { OnboardingChecklist } from '../ui/OnboardingChecklist';

interface DashboardPageProps {
  // Server-fetched by the route shell (summary + today's appointments), passed
  // as initial state so there's no client fetch-on-mount waterfall. The route's
  // loading.tsx streams a skeleton while the server reads run.
  initialSummary: DashboardSummary;
  initialTodayAppts: ApiAppointment[];
}

interface DashboardSummary {
  todayAppointments: number;
  pendingApprovals: number;
  cancellationsToday: number;
  callsHandledToday: number;
  bookingsMadeToday: number;
  successRate: number;
  doctorCount: number;
  scheduledDoctorCount: number;
  patientCount: number;
  staffCount: number;
  aiConfigured: boolean;
}

interface ApiAppointment {
  id: string;
  scheduledAt: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  type: string;
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string; specialization: string };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardPage({
  initialSummary,
  initialTodayAppts,
}: DashboardPageProps) {
  const router = useRouter();
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] =
    useState(false);
  const summary = initialSummary;
  const todayAppts = initialTodayAppts;
  const { playNotificationSound } = useNotificationSound();

  // Navigation for the in-page CTAs. Mirrors the old onNavigate the client
  // route shell used to inject — now that the shell is a server component, the
  // page routes itself.
  const handleNavigate = (page: string, subPage?: string) => {
    if (page === 'settings' && subPage) {
      router.push(`/settings?tab=${subPage}`);
    } else {
      router.push(`/${page}`);
    }
  };

  const handleTestNotification = () => {
    playNotificationSound();
    toast.custom(
      () => (
        <AppointmentToast
          patientName="Demo patient"
          time="Now"
          doctor="Demo doctor"
        />
      ),
      { duration: 4000 },
    );
  };

  const stats = [
    {
      label: "Today's appointments",
      value: summary?.todayAppointments ?? 0,
      icon: <Calendar />,
      accent: 'primary' as const,
    },
    {
      label: 'Pending approvals',
      value: summary?.pendingApprovals ?? 0,
      icon: <Clock />,
      accent: 'warning' as const,
    },
    {
      label: 'Cancellations',
      value: summary?.cancellationsToday ?? 0,
      icon: <XCircle />,
      accent: 'destructive' as const,
    },
    {
      label: 'Calls handled',
      value: summary?.callsHandledToday ?? 0,
      icon: <PhoneCall />,
      accent: 'success' as const,
    },
  ];

  const aiTiles = [
    {
      label: 'Calls handled today',
      value: summary ? String(summary.callsHandledToday) : '0',
      icon: PhoneCall,
    },
    {
      label: 'Bookings made',
      value: summary ? String(summary.bookingsMadeToday) : '0',
      icon: Calendar,
    },
    {
      label: 'Success rate',
      value: summary ? `${summary.successRate}%` : '0%',
      icon: ThumbsUp,
    },
  ];

  const quickActions = [
    {
      label: 'New appointment',
      hint: 'Book a patient in',
      icon: Plus,
      action: () => setIsNewAppointmentModalOpen(true),
    },
    {
      label: 'View calendar',
      hint: 'See the full schedule',
      icon: Calendar,
      action: () => handleNavigate('appointments'),
    },
    {
      label: 'AI settings',
      hint: 'Tune the receptionist',
      icon: Bot,
      action: () => handleNavigate('settings', 'ai'),
    },
  ];

  return (
    <div>
      <TopBar
        title="Dashboard"
        actionButton={
          <Button onClick={() => setIsNewAppointmentModalOpen(true)}>
            <Plus />
            New appointment
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              accent={s.accent}
            />
          ))}
        </div>

        {/* Onboarding checklist — auto-hides once the clinic is fully set up. */}
        {summary && (
          <OnboardingChecklist
            doctorCount={summary.doctorCount}
            scheduledDoctorCount={summary.scheduledDoctorCount}
            patientCount={summary.patientCount}
            staffCount={summary.staffCount}
            aiConfigured={summary.aiConfigured}
            onNavigate={handleNavigate}
          />
        )}

        {/* AI status — the single branded gradient surface in the app. */}
        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-primary to-brand-teal text-primary-foreground shadow-lg">
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Bot className="size-6" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    AI Receptionist
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-white" />
                  </span>
                  <span className="text-sm text-primary-foreground/90">
                    Online &amp; active
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 text-primary-foreground hover:bg-white/25"
                onClick={() => handleNavigate('ai-receptionist')}
              >
                View details
                <ArrowRight />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {aiTiles.map((tile) => {
                const TileIcon = tile.icon;
                return (
                  <div
                    key={tile.label}
                    className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"
                  >
                    <div className="mb-2 flex items-center gap-2 text-primary-foreground/80">
                      <TileIcon className="size-4" />
                      <p className="text-sm">{tile.label}</p>
                    </div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {tile.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Today's appointments */}
        <SectionCard
          title="Today's appointments"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('appointments')}
            >
              View all
              <ArrowRight />
            </Button>
          }
          noPadding={todayAppts.length > 0}
        >
          {todayAppts.length === 0 ? (
            <EmptyState
              icon={<Calendar />}
              title="No appointments today"
              description="Nothing is scheduled for today. Add a new appointment to get started."
              action={
                <Button onClick={() => setIsNewAppointmentModalOpen(true)}>
                  <Plus />
                  Add appointment
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.map((apt) => (
                <li
                  key={apt.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-semibold text-primary">
                      {initials(apt.patient.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {apt.patient.fullName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {apt.doctor.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium text-foreground">
                        {formatTime(apt.scheduledAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">{apt.type}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Quick actions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.action}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:size-5">
                    <ActionIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {action.label}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {action.hint}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Hidden helper: keep test-notification handler reachable but unused
            in production UI. The hook setup at the top of this file must
            remain so the import isn't dead code. */}
        <button
          type="button"
          onClick={handleTestNotification}
          className="sr-only"
          aria-hidden="true"
        >
          test-notification
        </button>
      </div>

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
