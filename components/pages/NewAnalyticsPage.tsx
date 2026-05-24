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

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Calendar, Activity, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../ui/card';
import { Button } from '../ui/button';
import { TopBar } from '../ui/TopBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { motion } from 'motion/react';
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

interface NewAnalyticsPageProps {
  onNavigate?: (page: string) => void;
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30d', label: 'Last 30 Days' },
  { value: 'this-year', label: 'This Year' },
];

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function NewAnalyticsPage({
  onNavigate: _onNavigate,
}: NewAnalyticsPageProps) {
  void _onNavigate;
  const [range, setRange] = useState<AnalyticsRange>('this-month');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // loading defaults to true on first mount, and on subsequent range
    // changes we let the next .then() flip it. We don't pre-set loading here
    // (which would trigger react-hooks/set-state-in-effect); the brief stale
    // data while refetching is fine since the cards just show the old values.
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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

  const metricCards = [
    {
      label: 'Total Patients',
      value: totals.totalPatients,
      icon: Users,
      color: '#2F80ED',
      hint: 'All-time',
    },
    {
      label: 'Appointments (range)',
      value: totals.appointmentsInRange,
      icon: Calendar,
      color: '#56CCF2',
      hint: data ? RANGE_OPTIONS.find((r) => r.value === data.range)?.label : '',
    },
    {
      label: 'Completed (range)',
      value: totals.completedInRange,
      icon: Activity,
      color: '#27AE60',
      hint: data ? RANGE_OPTIONS.find((r) => r.value === data.range)?.label : '',
    },
    {
      label: 'Growth vs prev',
      value: formatPct(totals.growthRatePct),
      icon: TrendingUp,
      color: totals.growthRatePct >= 0 ? '#27AE60' : '#EB5757',
      hint: 'Appointments',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Analytics & Reports"
        description="Comprehensive insights into clinic performance"
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Filters */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm"
        >
          <div className="flex-1">
            <label className="text-sm text-gray-600 mb-2 block">
              Time Range
            </label>
            <Select
              value={range}
              onValueChange={(v) => setRange(v as AnalyticsRange)}
            >
              <SelectTrigger className="w-full">
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
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled
              title="Export not implemented yet"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="hover:shadow-lg transition-all cursor-pointer border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${metric.color}15` }}
                    >
                      <metric.icon
                        className="w-6 h-6"
                        style={{ color: metric.color }}
                      />
                    </div>
                    {metric.hint && (
                      <span className="text-xs text-gray-500">
                        {metric.hint}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-3xl text-[#333333]">
                    {loading ? '…' : metric.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Appointments Chart */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Monthly Appointment Trends</CardTitle>
                <CardDescription>
                  Appointment statistics over the past 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.monthly ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#999" />
                    <YAxis stroke="#999" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="appointments"
                      stroke="#2F80ED"
                      strokeWidth={3}
                      dot={{ fill: '#2F80ED', r: 5 }}
                      name="Total Appointments"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#27AE60"
                      strokeWidth={3}
                      dot={{ fill: '#27AE60', r: 5 }}
                      name="Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Appointments Chart */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Weekly Appointments Breakdown</CardTitle>
                <CardDescription>
                  Current week, by day (Mon → Sun)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.weekly ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#999" />
                    <YAxis stroke="#999" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="booked"
                      fill="#2F80ED"
                      radius={[8, 8, 0, 0]}
                      name="Booked"
                    />
                    <Bar
                      dataKey="confirmed"
                      fill="#27AE60"
                      radius={[8, 8, 0, 0]}
                      name="Confirmed"
                    />
                    <Bar
                      dataKey="cancelled"
                      fill="#F2994A"
                      radius={[8, 8, 0, 0]}
                      name="Cancelled"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
