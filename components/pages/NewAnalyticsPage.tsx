import { TrendingUp, Users, Calendar, Activity, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion } from 'motion/react';
import { useState } from 'react';
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

const appointmentData = [
  { month: 'Jan', appointments: 45, completed: 42 },
  { month: 'Feb', appointments: 52, completed: 48 },
  { month: 'Mar', appointments: 61, completed: 58 },
  { month: 'Apr', appointments: 58, completed: 55 },
  { month: 'May', appointments: 70, completed: 67 },
  { month: 'Jun', appointments: 75, completed: 72 },
];

const weeklyAppointmentsData = [
  { day: 'Mon', booked: 12, confirmed: 10, canceled: 2 },
  { day: 'Tue', booked: 15, confirmed: 13, canceled: 2 },
  { day: 'Wed', booked: 18, confirmed: 15, canceled: 3 },
  { day: 'Thu', booked: 14, confirmed: 12, canceled: 2 },
  { day: 'Fri', booked: 20, confirmed: 17, canceled: 3 },
  { day: 'Sat', booked: 10, confirmed: 8, canceled: 2 },
  { day: 'Sun', booked: 5, confirmed: 4, canceled: 1 },
];

interface NewAnalyticsPageProps {
  onNavigate?: (page: string) => void;
}

export function NewAnalyticsPage({ onNavigate }: NewAnalyticsPageProps) {
  const [timeRange, setTimeRange] = useState('month');
  const [appointmentType, setAppointmentType] = useState('all');

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Analytics & Reports"
        description="Comprehensive insights into clinic performance"
        notificationCount={0}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Filters */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm"
        >
          <div className="flex-1">
            <label className="text-sm text-gray-600 mb-2 block">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-600 mb-2 block">Appointment Type</label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="checkup">General Checkup</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Patients',
              value: '1,284',
              change: '+8.2%',
              icon: Users,
              color: '#2F80ED',
            },
            {
              label: 'Appointments This Month',
              value: '75',
              change: '+15.3%',
              icon: Calendar,
              color: '#56CCF2',
            },
            {
              label: 'Completed Appointments',
              value: '72',
              change: '+12.5%',
              icon: Activity,
              color: '#27AE60',
            },
            {
              label: 'Growth Rate',
              value: '18.7%',
              change: '+3.1%',
              icon: TrendingUp,
              color: '#F2994A',
            },
          ].map((metric, index) => (
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
                      <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
                    </div>
                    <span className="text-sm font-medium text-[#27AE60]">{metric.change}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-3xl text-[#333333]">{metric.value}</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Monthly Appointment Trends</CardTitle>
                    <CardDescription>Appointment statistics over the past 6 months</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={appointmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#999" />
                    <YAxis stroke="#999" />
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Appointments Breakdown</CardTitle>
                    <CardDescription>Current month week-by-week performance</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyAppointmentsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="booked" fill="#2F80ED" radius={[8, 8, 0, 0]} name="Booked" />
                    <Bar dataKey="confirmed" fill="#27AE60" radius={[8, 8, 0, 0]} name="Confirmed" />
                    <Bar dataKey="canceled" fill="#F2994A" radius={[8, 8, 0, 0]} name="Canceled" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators for this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { label: 'Patient Satisfaction Score', value: 96, color: '#27AE60' },
                  { label: 'Appointment Show-up Rate', value: 92, color: '#2F80ED' },
                  { label: 'AI Receptionist Efficiency', value: 94, color: '#56CCF2' },
                  { label: 'Average Wait Time (mins)', value: 15, color: '#F2994A', isInverted: true },
                ].map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{metric.label}</span>
                      <span className="text-sm font-medium" style={{ color: metric.color }}>
                        {metric.isInverted ? `${metric.value} mins` : `${metric.value}%`}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: metric.isInverted ? '85%' : `${metric.value}%` }}
                        transition={{ duration: 1, delay: 0.7 + index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}