'use client';

// AI Receptionist page — call log viewer.
//
// Sources of truth: /api/calls and /api/dashboard-summary. Both are
// tenant-scoped. The new-clinic empty state shows "0 calls yet — once your
// phone is connected, calls appear here" so a fresh registration doesn't see
// fake transcripts.
//
// Compared to the original mock-data version we drop:
//   • the showLargeDataset / showEmptyState DevControls toggles (irrelevant
//     once we're rendering real DB rows),
//   • the dialog showing "mockNotifications" (the TopBar bell owns those),
//   • the fictional sentiment/callQuality fields the mock data carried that
//     CallLog rows don't always have populated yet.
//
// CallLog.transcript is stored as a JSON blob with shape
//   [{ role: 'ai'|'user'|'patient', text: string, timestamp?: string }, ...]
// when the voice runtime writes to it. We parse it defensively — older or
// partially-completed rows may have an empty array or null.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Phone,
  TrendingUp,
  CheckCircle,
  Search,
  X,
  PhoneCall,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Activity,
  User,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { TopBar } from '../ui/TopBar';
import { StatsBar } from '../ui/StatsBar';
import { motion, AnimatePresence } from 'motion/react';

interface AIReceptionistPageProps {
  // Server-fetched by app/(dashboard)/ai-receptionist/page.tsx and passed as
  // initial state — no client fetch-on-mount, so the route's loading.tsx
  // skeleton streams while the server reads the data.
  initialCalls: ApiCallLog[];
  initialSummary: DashboardSummary;
}

interface ApiCallLog {
  id: string;
  patientPhone: string;
  durationSec: number;
  detectedIntent: 'Booking' | 'Reschedule' | 'Cancellation' | 'Inquiry' | null;
  outcome: 'Completed' | 'Assisted' | 'Transferred' | 'Failed';
  transcript: unknown;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | null;
  startedAt: string;
  endedAt: string | null;
  patient: { id: string; fullName: string } | null;
}

interface DashboardSummary {
  callsHandledToday: number;
  bookingsMadeToday: number;
  successRate: number;
}

interface TranscriptSegment {
  role: string;
  text: string;
  timestamp?: string;
}

const PANEL_HEIGHT = 520;

function formatDurationSec(sec: number): string {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseTranscript(raw: unknown): TranscriptSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const obj = s as Record<string, unknown>;
      return {
        role: typeof obj.role === 'string' ? obj.role : 'ai',
        text: typeof obj.text === 'string' ? obj.text : '',
        timestamp:
          typeof obj.timestamp === 'string' ? obj.timestamp : undefined,
      };
    });
}

function intentIcon(intent: ApiCallLog['detectedIntent']) {
  switch (intent) {
    case 'Booking':
      return Calendar;
    case 'Inquiry':
      return PhoneIncoming;
    case 'Reschedule':
      return PhoneOutgoing;
    case 'Cancellation':
      return PhoneMissed;
    default:
      return Phone;
  }
}

function outcomeStyle(outcome: ApiCallLog['outcome']): {
  label: string;
  className: string;
} {
  switch (outcome) {
    case 'Completed':
      return { label: 'Completed', className: 'bg-[#27AE60]/10 text-[#27AE60]' };
    case 'Assisted':
      return { label: 'Assisted', className: 'bg-[#F2994A]/10 text-[#F2994A]' };
    case 'Transferred':
      return { label: 'Transferred', className: 'bg-[#2F80ED]/10 text-[#2F80ED]' };
    case 'Failed':
    default:
      return { label: 'Failed', className: 'bg-[#EB5757]/10 text-[#EB5757]' };
  }
}

function intentLabel(intent: ApiCallLog['detectedIntent']): string {
  return intent ?? 'Unknown';
}

export function AIReceptionistPage({
  initialCalls,
  initialSummary,
}: AIReceptionistPageProps) {
  const router = useRouter();
  const [calls] = useState<ApiCallLog[]>(initialCalls);
  const [summary] = useState<DashboardSummary | null>(initialSummary);
  // Data arrives as props (server-rendered), so there's no client loading/error
  // state — the route-level loading.tsx handles the pending UI. A router.refresh()
  // re-runs the server component to pull fresh calls.
  const loading = false;
  const error: string | null = null;
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calls.filter((call) => {
      const name = call.patient?.fullName ?? '';
      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        call.patientPhone.toLowerCase().includes(q);
      const matchesOutcome =
        outcomeFilter === 'all' || call.outcome === outcomeFilter;
      return matchesSearch && matchesOutcome;
    });
  }, [calls, searchQuery, outcomeFilter]);

  // Pick the active call: explicit selection wins, otherwise default to the
  // first item in the filtered list. Computing it during render (rather than
  // syncing via an effect) avoids react-hooks/set-state-in-effect and an
  // extra paint cycle on first load.
  const selectedCall =
    (selectedCallId && filteredCalls.find((c) => c.id === selectedCallId)) ||
    filteredCalls[0] ||
    null;
  const selectedTranscript = useMemo(
    () => (selectedCall ? parseTranscript(selectedCall.transcript) : []),
    [selectedCall],
  );

  const stats = [
    {
      label: 'Calls Handled Today',
      value: summary?.callsHandledToday ?? 0,
      icon: PhoneCall,
      color: '#2F80ED',
    },
    {
      label: 'Successful Bookings',
      value: summary?.bookingsMadeToday ?? 0,
      icon: CheckCircle,
      color: '#27AE60',
    },
    {
      label: 'Success Rate',
      value: summary ? `${summary.successRate}%` : '—',
      icon: TrendingUp,
      color: '#56CCF2',
    },
    {
      label: 'Total Calls (recent)',
      value: calls.length,
      icon: Clock,
      color: '#F2994A',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar title="AI Receptionist" />

      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
        <StatsBar stats={stats} />

        {/* Filters */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by caller name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-full sm:w-44 h-12">
              <SelectValue placeholder="Filter by outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Assisted">Assisted</SelectItem>
              <SelectItem value="Transferred">Transferred</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Two-panel layout */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Call List ── */}
            <div className="lg:col-span-2">
              <div
                className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                style={{ height: PANEL_HEIGHT }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                  <h3 className="text-base font-semibold leading-none">
                    Recent Calls
                  </h3>
                  <span className="text-xs text-gray-500">
                    {loading ? '…' : `${filteredCalls.length} total`}
                  </span>
                </div>

                <div className="flex-1 overflow-hidden">
                  {error ? (
                    <div className="h-full flex items-center justify-center p-12 text-center">
                      <div>
                        <Phone className="w-12 h-12 text-red-300 mx-auto mb-3" />
                        <h3 className="text-base text-gray-700 mb-1">
                          Couldn&apos;t load calls
                        </h3>
                        <p className="text-sm text-gray-500">{error}</p>
                      </div>
                    </div>
                  ) : filteredCalls.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-12 text-center">
                      <div>
                        <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base text-gray-600 mb-1">
                          {calls.length === 0
                            ? '0 calls yet'
                            : 'No Calls Match Filter'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {calls.length === 0
                            ? 'Connect your AI phone number and customize the greeting to start taking calls.'
                            : 'Try adjusting your search or filters.'}
                        </p>
                        {calls.length === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-[#2F80ED] hover:text-white transition-all"
                            onClick={() => router.push('/settings?tab=ai')}
                          >
                            Configure AI Receptionist
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="divide-y divide-gray-100">
                        {filteredCalls.map((call, index) => {
                          const Icon = intentIcon(call.detectedIntent);
                          const oStyle = outcomeStyle(call.outcome);
                          const isSelected = selectedCallId === call.id;
                          const name =
                            call.patient?.fullName ?? call.patientPhone;
                          return (
                            <motion.div
                              key={call.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => setSelectedCallId(call.id)}
                              className={`relative px-6 py-4 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#2F80ED]/5'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#2F80ED] rounded-r-full" />
                              )}
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-medium text-[#333333] truncate pr-2">
                                      {name}
                                    </h3>
                                    <Badge
                                      className={`text-[10px] px-2 py-0.5 border-none shrink-0 ${oStyle.className}`}
                                    >
                                      {oStyle.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate mb-1.5">
                                    {call.patientPhone}
                                  </p>
                                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDurationSec(call.durationSec)}
                                    </span>
                                    <span>{formatTime(call.startedAt)}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>
                                      {intentLabel(call.detectedIntent)}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <ChevronRight className="w-4 h-4 text-[#2F80ED] shrink-0" />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>

            {/* ── Call Detail ── */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {selectedCall ? (
                  <motion.div
                    key={selectedCall.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                      style={{ height: PANEL_HEIGHT }}
                    >
                      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-sm shadow-sm">
                            {(selectedCall.patient?.fullName ?? '?')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold leading-none">
                              {selectedCall.patient?.fullName ??
                                'Unknown caller'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1.5">
                              {selectedCall.patientPhone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`text-xs ${outcomeStyle(selectedCall.outcome).className}`}
                          >
                            {outcomeStyle(selectedCall.outcome).label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedCallId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="px-6 py-3 bg-[#F7F9FB] border-b border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {formatTime(selectedCall.startedAt)} –{' '}
                            {formatTime(selectedCall.endedAt)}
                          </span>
                          <span className="text-gray-400">
                            ({formatDurationSec(selectedCall.durationSec)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-gray-400" />
                          <span>{intentLabel(selectedCall.detectedIntent)}</span>
                        </div>
                        {selectedCall.sentiment && (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[11px] px-2 py-0 h-5 border-none bg-gray-100 text-gray-700"
                            >
                              {selectedCall.sentiment}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                          {selectedTranscript.length === 0 ? (
                            <div className="p-12 text-center text-sm text-gray-500">
                              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                              No transcript captured for this call yet.
                            </div>
                          ) : (
                            <div className="p-6 flex flex-col gap-6">
                              {selectedTranscript.map((segment, index) => {
                                const isAI = segment.role === 'ai';
                                return (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.025 }}
                                    className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
                                  >
                                    <div
                                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                                        isAI
                                          ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2]'
                                          : 'bg-gradient-to-br from-[#27AE60] to-[#56CCF2]'
                                      }`}
                                    >
                                      {isAI ? (
                                        <Bot className="w-4 h-4" />
                                      ) : (
                                        <User className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="flex-1 max-w-[78%]">
                                      <div
                                        className={`flex items-center gap-2 mb-1 ${isAI ? '' : 'justify-end'}`}
                                      >
                                        <span className="text-xs font-medium text-gray-600">
                                          {isAI
                                            ? 'AI'
                                            : (selectedCall.patient?.fullName ??
                                              'Caller')}
                                        </span>
                                        {segment.timestamp && (
                                          <span className="text-[11px] text-gray-400">
                                            {segment.timestamp}
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                          isAI
                                            ? 'bg-gray-100 text-gray-700 rounded-tl-sm'
                                            : 'bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white rounded-tr-sm'
                                        }`}
                                      >
                                        {segment.text}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div
                      className="bg-white rounded-xl border flex items-center justify-center hover:shadow-lg transition-shadow"
                      style={{ height: PANEL_HEIGHT }}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED]/10 to-[#56CCF2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <PhoneCall className="w-8 h-8 text-[#2F80ED]/30" />
                        </div>
                        <h3 className="text-lg text-gray-600 mb-1">
                          {calls.length === 0
                            ? 'No calls to display'
                            : 'Select a Call'}
                        </h3>
                        <p className="text-sm text-gray-400 max-w-[260px]">
                          {calls.length === 0
                            ? 'Once your phone is connected, calls appear here.'
                            : 'Click on a call from the list to view the full details and transcript.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
