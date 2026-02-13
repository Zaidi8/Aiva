import { Download, TrendingUp, Calendar, Users, Bot, DollarSign, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DateRangePicker from '../ui/date-range-picker';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DateRange {
  start: string | null;
  end: string | null;
}

const appointmentTrends = [
  { month: 'Jun', appointments: 180 },
  { month: 'Jul', appointments: 210 },
  { month: 'Aug', appointments: 195 },
  { month: 'Sep', appointments: 240 },
  { month: 'Oct', appointments: 265 },
  { month: 'Nov', appointments: 290 },
];

const appointmentTypes = [
  { name: 'Checkup', value: 35, color: '#2F80ED' },
  { name: 'Follow-up', value: 25, color: '#56CCF2' },
  { name: 'Consultation', value: 20, color: '#27AE60' },
  { name: 'Emergency', value: 15, color: '#F2994A' },
  { name: 'Surgery', value: 5, color: '#EB5757' },
];

const aiPerformanceData = [
  { month: 'Jun', calls: 850, success: 88 },
  { month: 'Jul', calls: 920, success: 90 },
  { month: 'Aug', calls: 880, success: 89 },
  { month: 'Sep', calls: 1050, success: 92 },
  { month: 'Oct', calls: 1150, success: 93 },
  { month: 'Nov', calls: 1280, success: 94 },
];

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [metricFilter, setMetricFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('6months');

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl text-[#333333]">Analytics & Reports</h1>
            <p className="text-gray-600 mt-1">Performance insights and data visualization</p>
          </div>
          <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
                  <p className="text-3xl text-[#333333] mb-1">1,247</p>
                  <div className="flex items-center gap-1 text-sm text-[#27AE60]">
                    <TrendingUp className="w-4 h-4" />
                    <span>+12% vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#2F80ED]/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#2F80ED]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Patients</p>
                  <p className="text-3xl text-[#333333] mb-1">248</p>
                  <div className="flex items-center gap-1 text-sm text-[#27AE60]">
                    <TrendingUp className="w-4 h-4" />
                    <span>+8% vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#27AE60]/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#27AE60]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">AI Success Rate</p>
                  <p className="text-3xl text-[#333333] mb-1">94%</p>
                  <div className="flex items-center gap-1 text-sm text-[#27AE60]">
                    <TrendingUp className="w-4 h-4" />
                    <span>+2% vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#56CCF2]/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#56CCF2]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Revenue</p>
                  <p className="text-3xl text-[#333333] mb-1">$45.2K</p>
                  <div className="flex items-center gap-1 text-sm text-[#27AE60]">
                    <TrendingUp className="w-4 h-4" />
                    <span>+15% vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#F2994A]/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#F2994A]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-48 h-12">
                      <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                      <SelectItem value="6months">Last 6 Months</SelectItem>
                      <SelectItem value="1year">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={metricFilter} onValueChange={setMetricFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-12">
                      <SelectValue placeholder="Metric Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Metrics</SelectItem>
                      <SelectItem value="appointments">Appointments Only</SelectItem>
                      <SelectItem value="patients">Patients Only</SelectItem>
                      <SelectItem value="ai">AI Performance</SelectItem>
                      <SelectItem value="revenue">Revenue Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                  
                  {(dateRange.start || dateRange.end || metricFilter !== 'all' || timeRange !== '6months') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateRange({ start: null, end: null });
                        setMetricFilter('all');
                        setTimeRange('6months');
                      }}
                      className="h-12"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment Trends */}
        <div className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <CardDescription>Monthly appointment volume over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={appointmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#2F80ED"
                    strokeWidth={3}
                    dot={{ fill: '#2F80ED', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* AI Performance */}
          <Card>
            <CardHeader>
              <CardTitle>AI Receptionist Performance</CardTitle>
              <CardDescription>Call volume and success rate trends</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#2F80ED" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointment Types */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Types Distribution</CardTitle>
              <CardDescription>Breakdown by appointment category</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={appointmentTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {appointmentTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {appointmentTypes.map((type) => (
                    <div key={type.name} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{type.name}</span>
                      <span className="text-sm text-[#333333] ml-auto">{type.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Highlights */}
        <div>
          <h2 className="text-2xl text-[#333333] mb-6">Performance Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-[#27AE60]">
              <CardContent className="p-6">
                <h3 className="text-sm text-gray-600 mb-2">Best Performing Day</h3>
                <p className="text-2xl text-[#333333] mb-1">Thursday</p>
                <p className="text-sm text-gray-500">Average 55 appointments</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#2F80ED]">
              <CardContent className="p-6">
                <h3 className="text-sm text-gray-600 mb-2">Peak Hours</h3>
                <p className="text-2xl text-[#333333] mb-1">10 AM - 2 PM</p>
                <p className="text-sm text-gray-500">Highest booking activity</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#56CCF2]">
              <CardContent className="p-6">
                <h3 className="text-sm text-gray-600 mb-2">Average Wait Time</h3>
                <p className="text-2xl text-[#333333] mb-1">12 mins</p>
                <p className="text-sm text-gray-500">Below target of 15 mins</p>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}