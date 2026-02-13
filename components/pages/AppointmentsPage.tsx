import { useState } from 'react';
import { Calendar as CalendarIcon, Search, Plus, Clock, User, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const appointments = [
  { id: 1, patient: 'John Smith', time: '09:00 AM', doctor: 'Dr. Williams', type: 'Checkup', status: 'confirmed', phone: '555-0101', notes: 'Annual physical examination' },
  { id: 2, patient: 'Sarah Johnson', time: '09:30 AM', doctor: 'Dr. Brown', type: 'Follow-up', status: 'pending', phone: '555-0102', notes: 'Follow-up for blood test results' },
  { id: 3, patient: 'Michael Davis', time: '10:00 AM', doctor: 'Dr. Williams', type: 'Consultation', status: 'confirmed', phone: '555-0103', notes: 'New patient consultation' },
  { id: 4, patient: 'Emily Wilson', time: '10:30 AM', doctor: 'Dr. Martinez', type: 'Surgery', status: 'confirmed', phone: '555-0104', notes: 'Minor procedure - pre-op completed' },
  { id: 5, patient: 'David Brown', time: '11:00 AM', doctor: 'Dr. Williams', type: 'Checkup', status: 'cancelled', phone: '555-0105', notes: 'Patient requested cancellation' },
  { id: 6, patient: 'Lisa Anderson', time: '02:00 PM', doctor: 'Dr. Brown', type: 'Emergency', status: 'confirmed', phone: '555-0106', notes: 'Urgent care - chest pain' },
  { id: 7, patient: 'Robert Taylor', time: '02:30 PM', doctor: 'Dr. Williams', type: 'Follow-up', status: 'pending', phone: '555-0107', notes: 'Post-surgery checkup' },
  { id: 8, patient: 'Jennifer White', time: '03:00 PM', doctor: 'Dr. Martinez', type: 'Consultation', status: 'confirmed', phone: '555-0108', notes: 'Initial consultation' },
];

export function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(appointments[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         apt.doctor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl text-[#333333]">Appointments</h1>
            <p className="text-gray-600 mt-1">Manage and schedule patient appointments</p>
          </div>
          <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar - Calendar and Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Today's Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-lg text-[#333333]">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confirmed</span>
                  <Badge className="bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20">
                    18
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <Badge className="bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20">
                    4
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <Badge className="bg-[#EB5757]/10 text-[#EB5757] hover:bg-[#EB5757]/20">
                    2
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Appointments List */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search patients or doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Appointments List */}
            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No appointments found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAppointments.map((apt) => (
                  <Card key={apt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white flex-shrink-0">
                            {apt.patient.split(' ').map(n => n[0]).join('')}
                          </div>
                          
                          {/* Patient Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg text-[#333333]">{apt.patient}</h3>
                              <Badge className={
                                apt.status === 'confirmed' ? 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20' :
                                apt.status === 'pending' ? 'bg-[#F2994A]/10 text-[#F2994A] hover:bg-[#F2994A]/20' :
                                'bg-[#EB5757]/10 text-[#EB5757] hover:bg-[#EB5757]/20'
                              }>
                                {apt.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {apt.time}
                              </span>
                              <span className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {apt.doctor}
                              </span>
                              <span className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {apt.phone}
                              </span>
                              <span className="text-gray-500">
                                Type: {apt.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAppointment(apt)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Appointment Details</DialogTitle>
                                <DialogDescription>
                                  Complete information about this appointment
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <label className="text-sm text-gray-600">Patient Name</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.patient}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Contact</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.phone}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Doctor</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.doctor}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Time</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.time}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Type</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.type}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Status</label>
                                  <p className="text-[#333333] mt-1 capitalize">{selectedAppointment.status}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600">Notes</label>
                                  <p className="text-[#333333] mt-1">{selectedAppointment.notes}</p>
                                </div>
                                <div className="flex gap-2 pt-4 border-t">
                                  <Button className="flex-1 bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                                    Reschedule
                                  </Button>
                                  <Button variant="outline" className="flex-1">
                                    Complete
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
