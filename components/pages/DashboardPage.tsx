'use client';

// Dashboard page — sources stat tiles from /api/dashboard-summary and the
// "Today's Appointments" list from /api/appointments?from=…&to=… for the
// current UTC day. Both fetches run in parallel on mount; the AI tile values
// (Calls Handled / Bookings / Success Rate) reuse the same dashboard-summary
// payload so we don't issue extra round-trips.

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
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
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { TopBar } from '../ui/TopBar';
import { StatsBar } from '../ui/StatsBar';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
import { motion } from 'motion/react';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { AppointmentToast } from '../ui/AppointmentToast';
import { apiGet } from '@/lib/client/fetcher';

interface DashboardPageProps {
  onNavigate?: (page: string, subPage?: string) => void;
}

interface DashboardSummary {
  todayAppointments: number;
  pendingApprovals: number;
  cancellationsToday: number;
  callsHandledToday: number;
  bookingsMadeToday: number;
  successRate: number;
}

interface ApiAppointment {
  id: string;
  scheduledAt: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  type: string;
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string; specialization: string };
}

function todayUtcBounds() {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function statusBadgeClass(status: ApiAppointment['status']): string {
  switch (status) {
    case 'Confirmed':
      return 'bg-[#27AE60]/10 text-[#27AE60]';
    case 'Pending':
      return 'bg-[#F2994A]/10 text-[#F2994A]';
    case 'Completed':
      return 'bg-[#2F80ED]/10 text-[#2F80ED]';
    case 'Cancelled':
    default:
      return 'bg-gray-200 text-gray-600';
  }
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const router = useRouter();
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] =
    useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todayAppts, setTodayAppts] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    // loading defaults to true — skip a redundant setLoading(true) so the
    // react-hooks/set-state-in-effect lint stays clean.
    let cancelled = false;
    const { from, to } = todayUtcBounds();
    Promise.all([
      apiGet<DashboardSummary>('/api/dashboard-summary'),
      apiGet<{ items: ApiAppointment[]; total: number }>(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&take=4`,
      ),
    ])
      .then(([s, a]) => {
        if (cancelled) return;
        setSummary(s);
        setTodayAppts(a.items.slice(0, 4));
      })
      .catch(() => {
        // Soft-fail: tiles render zeros, list shows empty state. The user
        // already sees the page; we don't want to block the chrome.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      label: "Today's Appointments",
      value: summary?.todayAppointments ?? 0,
      icon: Calendar,
      color: '#2F80ED',
    },
    {
      label: 'Pending Approvals',
      value: summary?.pendingApprovals ?? 0,
      icon: Clock,
      color: '#F2994A',
    },
    {
      label: 'Cancellations',
      value: summary?.cancellationsToday ?? 0,
      icon: XCircle,
      color: '#EB5757',
    },
    {
      label: 'Calls Handled',
      value: summary?.callsHandledToday ?? 0,
      icon: PhoneCall,
      color: '#27AE60',
    },
  ];

  const aiTiles = [
    {
      label: 'Calls Handled Today',
      value: summary ? String(summary.callsHandledToday) : '0',
      icon: PhoneCall,
    },
    {
      label: 'Bookings Made',
      value: summary ? String(summary.bookingsMadeToday) : '0',
      icon: Calendar,
    },
    {
      label: 'Success Rate',
      value: summary ? `${summary.successRate}%` : '0%',
      icon: ThumbsUp,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Dashboard"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsNewAppointmentModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* AI Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Bot className="w-10 h-10" />
                    </motion.div>
                    <h2 className="text-2xl">AI Receptionist</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-white rounded-full"
                    />
                    <span className="text-sm opacity-90">Online &amp; Active</span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => onNavigate?.('ai-receptionist')}
                >
                  View Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {aiTiles.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4 opacity-80" />
                      <p className="text-sm opacity-80">{stat.label}</p>
                    </div>
                    <p className="text-3xl">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Appointments */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-[#333333]">Today&apos;s Appointments</h2>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-[#2F80ED] hover:text-white transition-all"
              onClick={() => onNavigate?.('appointments')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {todayAppts.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-600 mb-2">
                  {loading ? 'Loading...' : 'No Appointments Today'}
                </h3>
                <p className="text-gray-500 mb-6">
                  No appointments are scheduled for today. Add a new appointment
                  to get started.
                </p>
                <Button
                  className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                  onClick={() => setIsNewAppointmentModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {todayAppts.map((apt, index) => (
                    <motion.div
                      key={apt.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white shadow-md">
                          {apt.patient.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[#333333] font-medium">
                            {apt.patient.fullName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {apt.doctor.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-600">
                            {formatTime(apt.scheduledAt)}
                          </p>
                          <p className="text-xs text-gray-500">{apt.type}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(apt.status)}`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl text-[#333333] mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'New Appointment',
                icon: Plus,
                gradient: 'from-[#2F80ED] to-[#56CCF2]',
                action: () => setIsNewAppointmentModalOpen(true),
              },
              {
                label: 'View Calendar',
                icon: Calendar,
                gradient: 'from-[#56CCF2] to-[#27AE60]',
                action: () => onNavigate?.('appointments'),
              },
              {
                label: 'AI Settings',
                icon: Bot,
                gradient: 'from-[#27AE60] to-[#2F80ED]',
                action: () => onNavigate?.('settings', 'ai'),
              },
            ].map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  className={`h-24 w-full bg-gradient-to-r ${action.gradient} hover:opacity-90 flex-col gap-3 shadow-md hover:shadow-lg transition-all`}
                  onClick={action.action}
                >
                  <action.icon className="w-7 h-7" />
                  <span className="text-base">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
