import { useState } from 'react';
import { Bell, Send, CheckCircle, XCircle, Clock, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const notifications = [
  {
    id: 1,
    patient: 'John Smith',
    phone: '555-0101',
    type: 'SMS',
    message: 'Reminder: Your appointment with Dr. Williams is tomorrow at 9:00 AM',
    status: 'delivered',
    sentAt: 'Nov 7, 08:00 AM',
    scheduledFor: 'Nov 8, 09:00 AM',
  },
  {
    id: 2,
    patient: 'Sarah Johnson',
    phone: '555-0102',
    type: 'Email',
    message: 'Your appointment has been confirmed for Nov 12 at 10:30 AM',
    status: 'delivered',
    sentAt: 'Nov 7, 10:15 AM',
    scheduledFor: 'Nov 12, 10:30 AM',
  },
  {
    id: 3,
    patient: 'Michael Davis',
    phone: '555-0103',
    type: 'SMS',
    message: 'Appointment rescheduled to Nov 12 at 10:00 AM. Please confirm.',
    status: 'failed',
    sentAt: 'Nov 7, 11:30 AM',
    scheduledFor: 'Nov 12, 10:00 AM',
  },
  {
    id: 4,
    patient: 'Emily Wilson',
    phone: '555-0104',
    type: 'SMS',
    message: 'Reminder: Your appointment is in 2 hours',
    status: 'scheduled',
    sentAt: null,
    scheduledFor: 'Nov 8, 07:30 AM',
  },
  {
    id: 5,
    patient: 'David Brown',
    phone: '555-0105',
    type: 'Email',
    message: 'Thank you for visiting. Please complete our feedback survey.',
    status: 'delivered',
    sentAt: 'Nov 7, 03:45 PM',
    scheduledFor: null,
  },
  {
    id: 6,
    patient: 'Lisa Anderson',
    phone: '555-0106',
    type: 'SMS',
    message: 'Your test results are ready. Please call to discuss.',
    status: 'delivered',
    sentAt: 'Nov 7, 02:30 PM',
    scheduledFor: null,
  },
];

export function NotificationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notif.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl text-[#333333]">Notifications & Reminders</h1>
            <p className="text-gray-600 mt-1">Manage automated messages and patient communications</p>
          </div>
          <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
            <Send className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sent Today</p>
                  <p className="text-3xl text-[#333333]">47</p>
                </div>
                <div className="w-12 h-12 bg-[#2F80ED]/10 rounded-full flex items-center justify-center">
                  <Send className="w-6 h-6 text-[#2F80ED]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Delivered</p>
                  <p className="text-3xl text-[#333333]">44</p>
                </div>
                <div className="w-12 h-12 bg-[#27AE60]/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#27AE60]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                  <p className="text-3xl text-[#333333]">12</p>
                </div>
                <div className="w-12 h-12 bg-[#F2994A]/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#F2994A]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-3xl text-[#333333]">3</p>
                </div>
                <div className="w-12 h-12 bg-[#EB5757]/10 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-[#EB5757]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>All automated messages sent to patients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500">No notifications found</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className="p-4 bg-[#F7F9FB] rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white flex-shrink-0">
                            {notif.patient.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[#333333]">{notif.patient}</h3>
                              {notif.type === 'SMS' ? (
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Mail className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{notif.phone}</p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            notif.status === 'delivered' 
                              ? 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20' 
                              : notif.status === 'scheduled'
                              ? 'bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20'
                              : 'bg-[#EB5757]/10 text-[#EB5757] hover:bg-[#EB5757]/20'
                          }
                        >
                          {notif.status}
                        </Badge>
                      </div>

                      <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                        <p className="text-sm text-gray-700">{notif.message}</p>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        {notif.sentAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Sent: {notif.sentAt}
                          </span>
                        )}
                        {notif.scheduledFor && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Scheduled: {notif.scheduledFor}
                          </span>
                        )}
                      </div>

                      {notif.status === 'failed' && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4 mr-1" />
                            Resend
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
