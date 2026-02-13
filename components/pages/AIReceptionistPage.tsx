import { Bot, Phone, MessageSquare, TrendingUp, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

const callLogs = [
  {
    id: 1,
    caller: 'John Smith',
    phone: '555-0101',
    time: '10:45 AM',
    duration: '3:24',
    type: 'booking',
    status: 'success',
    summary: 'Booked appointment for Nov 15 with Dr. Williams',
  },
  {
    id: 2,
    caller: 'Sarah Johnson',
    phone: '555-0102',
    time: '10:30 AM',
    duration: '2:15',
    type: 'inquiry',
    status: 'success',
    summary: 'Provided clinic hours and location information',
  },
  {
    id: 3,
    caller: 'Michael Davis',
    phone: '555-0103',
    time: '10:15 AM',
    duration: '4:10',
    type: 'reschedule',
    status: 'success',
    summary: 'Rescheduled appointment from Nov 10 to Nov 12',
  },
  {
    id: 4,
    caller: 'Emily Wilson',
    phone: '555-0104',
    time: '09:50 AM',
    duration: '1:45',
    type: 'cancellation',
    status: 'transferred',
    summary: 'Transferred to staff for complex cancellation',
  },
  {
    id: 5,
    caller: 'David Brown',
    phone: '555-0105',
    time: '09:30 AM',
    duration: '2:45',
    type: 'booking',
    status: 'success',
    summary: 'Booked appointment for Nov 18 with Dr. Brown',
  },
];

export function AIReceptionistPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl text-[#333333]">AI Receptionist</h1>
            <p className="text-gray-600 mt-1">Monitor and manage AI virtual assistant activity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#27AE60]/10 text-[#27AE60] rounded-lg">
              <div className="w-2 h-2 bg-[#27AE60] rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
            <Button variant="outline">Configure Settings</Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Phone className="w-8 h-8" />
              </div>
              <div className="text-3xl mb-1">47</div>
              <p className="text-sm opacity-90">Calls Handled Today</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-[#27AE60]" />
              </div>
              <div className="text-3xl text-[#333333] mb-1">32</div>
              <p className="text-sm text-gray-600">Successful Bookings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-[#56CCF2]" />
              </div>
              <div className="text-3xl text-[#333333] mb-1">94%</div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-[#F2994A]" />
              </div>
              <div className="text-3xl text-[#333333] mb-1">3:15</div>
              <p className="text-sm text-gray-600">Avg. Call Duration</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Performance Card */}
        <div className="mb-12">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#2F80ED]" />
                    AI Performance Metrics
                  </CardTitle>
                  <CardDescription className="mt-1">Real-time insights into AI assistant performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Call Completion Rate</span>
                    <span className="text-sm text-[#27AE60]">96%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#27AE60] rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="text-sm text-[#27AE60]">4.6/5</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#27AE60] rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Accuracy</span>
                    <span className="text-sm text-[#27AE60]">98%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#27AE60] rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call Logs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-[#333333]">Recent Call Logs</h2>
            <Button variant="outline" size="sm">View All Logs</Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {callLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-4 bg-[#F7F9FB] rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white">
                            {log.caller.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-[#333333]">{log.caller}</h3>
                            <p className="text-sm text-gray-600">{log.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">{log.time}</p>
                          <Badge 
                            className={
                              log.status === 'success' 
                                ? 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20' 
                                : 'bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20'
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mb-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {log.duration}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {log.type}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                        {log.summary}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm">
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Play Recording
                        </Button>
                        <Button variant="outline" size="sm">
                          View Transcript
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
