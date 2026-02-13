import { Calendar, Clock, XCircle, ThumbsUp, Plus, ArrowRight, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const recentAppointments = [
  { id: 1, patient: 'John Smith', time: '09:00 AM', doctor: 'Dr. Williams', status: 'confirmed' },
  { id: 2, patient: 'Sarah Johnson', time: '10:30 AM', doctor: 'Dr. Brown', status: 'pending' },
  { id: 3, patient: 'Michael Davis', time: '02:00 PM', doctor: 'Dr. Williams', status: 'confirmed' },
  { id: 4, patient: 'Emily Wilson', time: '03:30 PM', doctor: 'Dr. Martinez', status: 'completed' },
];

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl text-[#333333]">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview for today.</p>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Stats Cards - Clean and spacious */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-l-4 border-l-[#2F80ED] hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Today's Appointments</CardTitle>
                <Calendar className="w-5 h-5 text-[#2F80ED]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl text-[#333333] mb-1">24</div>
              <p className="text-sm text-gray-500">+3 from yesterday</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#F2994A] hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Pending Approvals</CardTitle>
                <Clock className="w-5 h-5 text-[#F2994A]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl text-[#333333] mb-1">7</div>
              <p className="text-sm text-gray-500">Requires attention</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#EB5757] hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Cancellations</CardTitle>
                <XCircle className="w-5 h-5 text-[#EB5757]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl text-[#333333] mb-1">3</div>
              <p className="text-sm text-gray-500">Today</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#27AE60] hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Patient Satisfaction</CardTitle>
                <ThumbsUp className="w-5 h-5 text-[#27AE60]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl text-[#333333] mb-1">4.6</div>
              <p className="text-sm text-gray-500">Average rating</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Status - Prominent and clean */}
        <div className="mb-12">
          <Card className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Bot className="w-8 h-8" />
                    <h2 className="text-2xl">AI Receptionist</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm opacity-90">Online & Active</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  View Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                  <p className="text-sm opacity-80 mb-1">Calls Handled Today</p>
                  <p className="text-3xl">47</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                  <p className="text-sm opacity-80 mb-1">Bookings Made</p>
                  <p className="text-3xl">32</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                  <p className="text-sm opacity-80 mb-1">Success Rate</p>
                  <p className="text-3xl">94%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments - Clean list */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-[#333333]">Today's Appointments</h2>
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentAppointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex items-center justify-between p-4 bg-[#F7F9FB] rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white">
                        {apt.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-[#333333]">{apt.patient}</p>
                        <p className="text-sm text-gray-600">{apt.doctor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-600">{apt.time}</p>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        apt.status === 'confirmed' ? 'bg-[#27AE60]/10 text-[#27AE60]' :
                        apt.status === 'pending' ? 'bg-[#F2994A]/10 text-[#F2994A]' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl text-[#333333] mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button className="h-auto py-6 bg-[#2F80ED] hover:bg-[#2F80ED]/90 flex-col gap-2">
              <Plus className="w-6 h-6" />
              <span>New Appointment</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Calendar className="w-6 h-6" />
              <span>View Calendar</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Bot className="w-6 h-6" />
              <span>AI Settings</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
