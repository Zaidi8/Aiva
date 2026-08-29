'use client';

// Analytics page — pulls totals + chart series from /api/analytics.
//
// The "Appointment Type" filter is UI-only for now (the backend doesn't
// segment by type yet). The "Time Range" filter maps to /api/analytics's
// `range` query param: this-week | this-month | last-30d | this-year.
// Changing it re-fetches the payload, and the charts re-bind reactively.
//
// We drop the previous static literal cards (1,284 patients / 18.7% growth)
// and the Performance Metrics card whose values were entirely fabricated.

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Users, Calendar, Activity, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { StatCard } from '../ui/stat-card';
import { SectionCard } from '../ui/section-card';
import { TopBar } from '../ui/TopBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiGet } from '@/lib/client/fetcher';

type AnalyticsRange = 'this-week' | 'this-month' | 'last-30d' | 'this-year';

interface AnalyticsPayload {
  range: AnalyticsRange;
  totals: {
    totalPatients: number;
    appointmentsInRange: number;
    completedInRange: number;
    growthRatePct: number;
  };
  monthly: Array<{ month: string; appointments: number; completed: number }>;
  weekly: Array<{
    day: string;
    booked: number;
    confirmed: number;
    cancelled: number;
  }>;
}

interface AnalyticsPageProps {
  // Server-fetched default-range payload from the route shell. Switching range
  // refetches client-side (stale-while-revalidate) without a full navigation.
  initialData: AnalyticsPayload;
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30d', label: 'Last 30 Days' },
  { value: 'this-year', label: 'This Year' },
];

// Concrete hex pulled from the design tokens in globals.css — recharts renders
// SVG and can't resolve CSS custom properties, so the series colors are kept in
// sync with --primary / --success / --destructive / --brand-teal by hand.
const CHART = {
  primary: '#4f46e5', // indigo — brand primary
  success: '#059669', // emerald — completed / confirmed
  destructive: '#dc2626', // red — cancelled
  grid: '#e2e8f0', // slate-200 — gridlines
  axis: '#64748b', // slate-500 — axis labels
} as const;

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function AnalyticsPage({ initialData }: AnalyticsPageProps) {
  const [range, setRange] = useState<AnalyticsRange>(initialData.range);
  const [data, setData] = useState<AnalyticsPayload | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const didMount = useRef(false);

  useEffect(() => {
    // Initial render already has server-fetched data for the default range —
    // skip that first run. Only a user-initiated range change refetches, and
    // it's stale-while-revalidate (the old cards stay until fresh data lands),
    // so there's no synchronous setState here and no loading flash.
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    let cancelled = false;
    apiGet<AnalyticsPayload>(`/api/analytics?range=${range}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load analytics.');
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = data?.totals ?? {
    totalPatients: 0,
    appointmentsInRange: 0,
    completedInRange: 0,
    growthRatePct: 0,
  };

  const rangeLabel = data
    ? (RANGE_OPTIONS.find((r) => r.value === data.range)?.label ?? '')
    : '';

  const metricCards = [
    {
      label: 'Total patients',
      value: totals.totalPatients,
      icon: <Users />,
      accent: 'primary' as const,
      hint: 'All-time',
    },
    {
      label: 'Appointments (range)',
      value: totals.appointmentsInRange,
      icon: <Calendar />,
      accent: 'info' as const,
      hint: rangeLabel,
    },
    {
      label: 'Completed (range)',
      value: totals.completedInRange,
      icon: <Activity />,
      accent: 'success' as const,
      hint: rangeLabel,
    },
    {
      label: 'Growth vs prev',
      value: formatPct(totals.growthRatePct),
      icon: <TrendingUp />,
      accent: (totals.growthRatePct >= 0 ? 'success' : 'destructive') as
        | 'success'
        | 'destructive',
      hint: 'vs previous period',
    },
  ];

  return (
    <div>
      <TopBar
        title="Analytics & Reports"
        description="Comprehensive insights into clinic performance"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Time range
            </span>
            <Select
              value={range}
              onValueChange={(v) => setRange(v as AnalyticsRange)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled
            title="Export not implemented yet"
          >
            <Download />
            Export report
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              accent={metric.accent}
              hint={metric.hint}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Appointments Chart */}
          <SectionCard
            title="Monthly appointment trends"
            description="Appointment statistics over the past 6 months"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis
                  dataKey="month"
                  stroke={CHART.axis}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                />
                <YAxis
                  stroke={CHART.axis}
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: '12px',
                    boxShadow:
                      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    fontSize: '13px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke={CHART.primary}
                  strokeWidth={2.5}
                  dot={{ fill: CHART.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Total appointments"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={CHART.success}
                  strokeWidth={2.5}
                  dot={{ fill: CHART.success, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Weekly Appointments Chart */}
          <SectionCard
            title="Weekly appointments breakdown"
            description="Current week, by day (Mon → Sun)"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.weekly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis
                  dataKey="day"
                  stroke={CHART.axis}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                />
                <YAxis
                  stroke={CHART.axis}
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                />
                <Tooltip
                  cursor={{ fill: 'rgb(79 70 229 / 0.06)' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: '12px',
                    boxShadow:
                      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    fontSize: '13px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Bar
                  dataKey="booked"
                  fill={CHART.primary}
                  radius={[6, 6, 0, 0]}
                  name="Booked"
                />
                <Bar
                  dataKey="confirmed"
                  fill={CHART.success}
                  radius={[6, 6, 0, 0]}
                  name="Confirmed"
                />
                <Bar
                  dataKey="cancelled"
                  fill={CHART.destructive}
                  radius={[6, 6, 0, 0]}
                  name="Cancelled"
                />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
