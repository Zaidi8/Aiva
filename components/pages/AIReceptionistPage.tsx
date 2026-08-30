'use client';

// AI Receptionist page — call log viewer.
//
// Sources of truth: server-fetched call list + dashboard summary (passed as
// initial props by app/(dashboard)/ai-receptionist/page.tsx). The new-clinic
// empty state shows "0 calls yet — once your phone is connected, calls appear
// here" so a fresh registration doesn't see fake transcripts.
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
import { StatCard } from '../ui/stat-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { TopBar } from '../ui/TopBar';
import { cn } from '../ui/utils';
import DateRangePicker from '../ui/date-range-picker';

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

// Local YYYY-MM-DD key (used for "history day" grouping + date-range compare).
function toDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive-soft';

// Map each call outcome to a soft, tinted status badge variant.
function outcomeBadge(outcome: ApiCallLog['outcome']): {
  label: string;
  variant: BadgeVariant;
} {
  switch (outcome) {
    case 'Completed':
      return { label: 'Completed', variant: 'success' };
    case 'Assisted':
      return { label: 'Assisted', variant: 'warning' };
    case 'Transferred':
      return { label: 'Transferred', variant: 'info' };
    case 'Failed':
    default:
      return { label: 'Failed', variant: 'destructive-soft' };
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
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: string | null;
    end: string | null;
  }>({ start: null, end: null });

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
      const key = toDateKey(call.startedAt);
      const matchesDate =
        !dateRange.start || !dateRange.end
          ? true
          : key !== '' &&
            key >= dateRange.start &&
            key <= dateRange.end;
      return matchesSearch && matchesOutcome && matchesDate;
    });
  }, [calls, searchQuery, outcomeFilter, dateRange]);

  // Group the filtered calls into day buckets for a history view. Each bucket
  // maps a YYYY-MM-DD key to its calls, newest day first (calls already sorted
  // desc by startedAt server-side, so list order is preserved within a day).
  const historyGroups = useMemo(() => {
    const groups = new Map<string, ApiCallLog[]>();
    for (const call of filteredCalls) {
      const key = toDateKey(call.startedAt);
      if (!key) continue;
      const bucket = groups.get(key);
      if (bucket) bucket.push(call);
      else groups.set(key, [call]);
    }
    return Array.from(groups.entries());
  }, [filteredCalls]);

  // Pick the active call: explicit selection wins, otherwise default to the
  // first item in the filtered list. Computed during render to avoid an
  // effect-driven extra paint.
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
      label: 'Calls handled today',
      value: summary?.callsHandledToday ?? 0,
      icon: <PhoneCall />,
      accent: 'primary' as const,
    },
    {
      label: 'Successful bookings',
      value: summary?.bookingsMadeToday ?? 0,
      icon: <CheckCircle />,
      accent: 'success' as const,
    },
    {
      label: 'Success rate',
      value: summary ? `${summary.successRate}%` : '—',
      icon: <TrendingUp />,
      accent: 'teal' as const,
    },
    {
      label: 'Total calls (recent)',
      value: calls.length,
      icon: <Clock />,
      accent: 'warning' as const,
    },
  ];

  return (
    <div>
      <TopBar
        title="AI Receptionist"
        description="Review calls your AI receptionist handled and read full transcripts"
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
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

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by caller name or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All calls</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Assisted">Assisted</SelectItem>
              <SelectItem value="Transferred">Transferred</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Two-panel master/detail layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── Call list ── */}
          <div className="lg:col-span-2">
            <div
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              style={{ height: PANEL_HEIGHT }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-base font-semibold leading-none text-foreground">
                  Recent calls
                </h3>
                <span className="text-xs text-muted-foreground">
                  {filteredCalls.length} total
                </span>
              </div>

              <div className="flex-1 overflow-hidden">
                {filteredCalls.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-12 text-center">
                    <div>
                      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                        <Phone className="size-6 text-muted-foreground" />
                      </div>
                      <h3 className="mb-1 text-base font-medium text-foreground">
                        {calls.length === 0 ? '0 calls yet' : 'No calls match'}
                      </h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {calls.length === 0
                          ? 'Connect your AI phone number and customize the greeting to start taking calls.'
                          : 'Try adjusting your search or filters.'}
                      </p>
                      {calls.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push('/settings?tab=ai')}
                        >
                          Configure AI receptionist
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="divide-y divide-border">
                      {historyGroups.map(([dateKey, groupCalls]) => (
                        <div key={dateKey}>
                          <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-2 backdrop-blur-sm">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {formatDayLabel(groupCalls[0].startedAt)}
                            </span>
                          </div>
                          <ul className="divide-y divide-border">
                            {groupCalls.map((call) => {
                              const Icon = intentIcon(call.detectedIntent);
                              const badge = outcomeBadge(call.outcome);
                              const isSelected =
                                selectedCall?.id === call.id;
                              const name =
                                call.patient?.fullName ?? call.patientPhone;
                              return (
                                <li key={call.id} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCallId(call.id)}
                                    className={cn(
                                      'flex w-full items-center gap-4 px-6 py-4 text-left transition-colors',
                                      isSelected
                                        ? 'bg-primary-muted/50'
                                        : 'hover:bg-muted/60',
                                    )}
                                  >
                                    {isSelected && (
                                      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-primary" />
                                    )}
                                    <div
                                      className={cn(
                                        'flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5',
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground',
                                      )}
                                    >
                                      <Icon />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <h4 className="truncate text-sm font-medium text-foreground">
                                          {name}
                                        </h4>
                                        <Badge variant={badge.variant}>
                                          {badge.label}
                                        </Badge>
                                      </div>
                                      <p className="mb-1.5 truncate text-xs text-muted-foreground">
                                        {call.patientPhone}
                                      </p>
                                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="size-3" />
                                          {formatDurationSec(call.durationSec)}
                                        </span>
                                        <span>{formatTime(call.startedAt)}</span>
                                        <span className="text-border">|</span>
                                        <span>
                                          {intentLabel(call.detectedIntent)}
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <ChevronRight className="size-4 shrink-0 text-primary" />
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          {/* ── Call detail ── */}
          <div className="lg:col-span-3">
            {selectedCall ? (
              <div
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                style={{ height: PANEL_HEIGHT }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {(selectedCall.patient?.fullName ?? '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold leading-none text-foreground">
                        {selectedCall.patient?.fullName ?? 'Unknown caller'}
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {selectedCall.patientPhone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={outcomeBadge(selectedCall.outcome).variant}>
                      {outcomeBadge(selectedCall.outcome).label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelectedCallId(null)}
                      aria-label="Close call detail"
                    >
                      <X />
                    </Button>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-muted/50 px-6 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>
                      {formatTime(selectedCall.startedAt)} –{' '}
                      {formatTime(selectedCall.endedAt)}
                    </span>
                    <span>({formatDurationSec(selectedCall.durationSec)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-3.5" />
                    <span>{intentLabel(selectedCall.detectedIntent)}</span>
                  </div>
                  {selectedCall.sentiment && (
                    <Badge variant="secondary">{selectedCall.sentiment}</Badge>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {selectedTranscript.length === 0 ? (
                      <div className="p-12 text-center text-sm text-muted-foreground">
                        <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                        No transcript captured for this call yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6 p-6">
                        {selectedTranscript.map((segment, index) => {
                          const isAI = segment.role === 'ai';
                          return (
                            <div
                              key={index}
                              className={cn(
                                'flex gap-3',
                                isAI ? '' : 'flex-row-reverse',
                              )}
                            >
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-4',
                                  isAI ? 'bg-primary' : 'bg-brand-teal',
                                )}
                              >
                                {isAI ? <Bot /> : <User />}
                              </div>
                              <div className="max-w-[78%] flex-1">
                                <div
                                  className={cn(
                                    'mb-1 flex items-center gap-2',
                                    isAI ? '' : 'justify-end',
                                  )}
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {isAI
                                      ? 'AI'
                                      : (selectedCall.patient?.fullName ??
                                        'Caller')}
                                  </span>
                                  {segment.timestamp && (
                                    <span className="text-[11px] text-muted-foreground/70">
                                      {segment.timestamp}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                                    isAI
                                      ? 'rounded-tl-sm bg-muted text-foreground'
                                      : 'rounded-tr-sm bg-primary text-primary-foreground',
                                  )}
                                >
                                  {segment.text}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-xl border border-border bg-card shadow-sm"
                style={{ height: PANEL_HEIGHT }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-muted">
                    <PhoneCall className="size-8 text-primary" />
                  </div>
                  <h3 className="mb-1 text-lg font-medium text-foreground">
                    {calls.length === 0 ? 'No calls to display' : 'Select a call'}
                  </h3>
                  <p className="mx-auto max-w-[260px] text-sm text-muted-foreground">
                    {calls.length === 0
                      ? 'Once your phone is connected, calls appear here.'
                      : 'Click a call from the list to view its full details and transcript.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
