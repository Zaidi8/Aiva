import { useState } from 'react';
import { Search, Plus, Phone, Mail, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

const patients = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '555-0101',
    lastVisit: 'Nov 5, 2025',
    nextAppointment: 'Nov 15, 2025',
    doctor: 'Dr. Williams',
    notes: 'Diabetic patient, requires regular monitoring',
    visits: 8,
    status: 'active',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '555-0102',
    lastVisit: 'Oct 28, 2025',
    nextAppointment: 'Nov 12, 2025',
    doctor: 'Dr. Brown',
    notes: 'Allergy to penicillin',
    visits: 5,
    status: 'active',
  },
  {
    id: 3,
    name: 'Michael Davis',
    email: 'mdavis@email.com',
    phone: '555-0103',
    lastVisit: 'Nov 1, 2025',
    nextAppointment: null,
    doctor: 'Dr. Williams',
    notes: 'New patient, first visit completed',
    visits: 1,
    status: 'new',
  },
  {
    id: 4,
    name: 'Emily Wilson',
    email: 'ewilson@email.com',
    phone: '555-0104',
    lastVisit: 'Oct 25, 2025',
    nextAppointment: 'Nov 10, 2025',
    doctor: 'Dr. Martinez',
    notes: 'Post-surgery follow-up required',
    visits: 12,
    status: 'active',
  },
  {
    id: 5,
    name: 'David Brown',
    email: 'dbrown@email.com',
    phone: '555-0105',
    lastVisit: 'Oct 15, 2025',
    nextAppointment: 'Nov 20, 2025',
    doctor: 'Dr. Williams',
    notes: 'Hypertension management',
    visits: 15,
    status: 'active',
  },
  {
    id: 6,
    name: 'Lisa Anderson',
    email: 'lisa.a@email.com',
    phone: '555-0106',
    lastVisit: 'Nov 3, 2025',
    nextAppointment: 'Nov 18, 2025',
    doctor: 'Dr. Brown',
    notes: 'Regular checkup patient',
    visits: 6,
    status: 'active',
  },
];

export function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl text-[#333333]">Patient Records</h1>
            <p className="text-gray-600 mt-1">Manage patient information and medical history</p>
          </div>
          <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Patients</p>
                  <p className="text-3xl text-[#333333]">248</p>
                </div>
                <div className="w-12 h-12 bg-[#2F80ED]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#2F80ED]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">New This Month</p>
                  <p className="text-3xl text-[#333333]">12</p>
                </div>
                <div className="w-12 h-12 bg-[#27AE60]/10 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6 text-[#27AE60]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Treatments</p>
                  <p className="text-3xl text-[#333333]">47</p>
                </div>
                <div className="w-12 h-12 bg-[#56CCF2]/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#56CCF2]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No patients found</p>
              </CardContent>
            </Card>
          ) : (
            filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <CardTitle className="text-base">{patient.name}</CardTitle>
                        <Badge 
                          className={
                            patient.status === 'new' 
                              ? 'bg-[#56CCF2]/10 text-[#56CCF2] hover:bg-[#56CCF2]/20 mt-1' 
                              : 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20 mt-1'
                          }
                        >
                          {patient.status === 'new' ? 'New Patient' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{patient.doctor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{patient.visits} visits</span>
                  </div>

                  <div className="pt-3 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Patient Details</DialogTitle>
                          <DialogDescription>
                            Complete medical record and appointment history
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          {/* Patient Info */}
                          <div className="flex items-center gap-4 p-4 bg-[#F7F9FB] rounded-lg">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-xl">
                              {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h3 className="text-lg text-[#333333]">{selectedPatient.name}</h3>
                              <p className="text-sm text-gray-600">{selectedPatient.visits} total visits</p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm text-gray-600">Email</label>
                              <p className="text-[#333333] mt-1 text-sm">{selectedPatient.email}</p>
                            </div>
                            <div>
                              <label className="text-sm text-gray-600">Phone</label>
                              <p className="text-[#333333] mt-1 text-sm">{selectedPatient.phone}</p>
                            </div>
                          </div>

                          {/* Appointments */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm text-gray-600">Last Visit</label>
                              <p className="text-[#333333] mt-1 text-sm">{selectedPatient.lastVisit}</p>
                            </div>
                            <div>
                              <label className="text-sm text-gray-600">Next Appointment</label>
                              <p className="text-[#333333] mt-1 text-sm">
                                {selectedPatient.nextAppointment || 'Not scheduled'}
                              </p>
                            </div>
                          </div>

                          {/* Doctor */}
                          <div>
                            <label className="text-sm text-gray-600">Primary Doctor</label>
                            <p className="text-[#333333] mt-1">{selectedPatient.doctor}</p>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="text-sm text-gray-600">Medical Notes</label>
                            <p className="text-[#333333] mt-1 text-sm">{selectedPatient.notes}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-4 border-t">
                            <Button className="flex-1 bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                              Schedule Appointment
                            </Button>
                            <Button variant="outline" className="flex-1">
                              Edit Record
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
