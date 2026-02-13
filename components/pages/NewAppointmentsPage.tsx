import { useState } from 'react';
import { Calendar as CalendarIcon, Search, Plus, Clock, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
import { motion } from 'motion/react';
import { mockAppointments } from '../../data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface NewAppointmentsPageProps {
  onNavigate?: (page: string) => void;
}

export function NewAppointmentsPage({ onNavigate }: NewAppointmentsPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLargeDataset, setShowLargeDataset] = useState(false);
  const itemsPerPage = 6;

  // Generate large dataset if enabled
  const largeDataset = showLargeDataset
    ? Array.from({ length: 50 }, (_, i) => ({
        ...mockAppointments[i % mockAppointments.length],
        id: `${i + 1}`,
        patient: `${mockAppointments[i % mockAppointments.length].patient} ${i + 1}`,
      }))
    : mockAppointments;

  const filteredAppointments = (showEmptyState ? [] : largeDataset).filter((apt) => {
    const matchesSearch =
      apt.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const todayAppointments = filteredAppointments.length;
  const confirmedAppointments = filteredAppointments.filter((a) => a.status === 'confirmed').length;
  const pendingAppointments = filteredAppointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Appointments"
        description="Manage and schedule patient appointments"
      />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Combined Calendar and Daily Summary */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#2F80ED]" />
                  Calendar & Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border-0 w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    table: "w-full border-collapse mt-4",
                    head_row: "flex w-full",
                    head_cell: "text-gray-500 rounded-md w-full font-normal text-[10px]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative w-full h-9",
                    day: "h-9 w-full p-0 font-normal hover:bg-[#2F80ED]/10 rounded-full transition-colors text-sm",
                    day_selected: "bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white hover:bg-gradient-to-r hover:from-[#2F80ED] hover:to-[#56CCF2] hover:text-white rounded-full",
                    day_today: "bg-gray-100 text-gray-900 rounded-full",
                    day_outside: "text-gray-400 opacity-50",
                  }}
                />

                <div className="pt-4 border-t space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex items-center justify-between p-3 bg-[#2F80ED]/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#2F80ED]" />
                      <span className="text-sm text-gray-600">Total</span>
                    </div>
                    <span className="text-lg font-semibold text-[#333333]">{todayAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#27AE60]/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#27AE60]" />
                      <span className="text-sm text-gray-600">Confirmed</span>
                    </div>
                    <span className="text-lg font-semibold text-[#333333]">{confirmedAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F2994A]/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F2994A]" />
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="text-lg font-semibold text-[#333333]">{pendingAppointments}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 h-12 shadow-md"
              onClick={() => setIsNewAppointmentModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </motion.div>

          {/* Main Content - Appointments List */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search patients or doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 h-12">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Appointments Grid */}
            {paginatedAppointments.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl text-gray-600 mb-2">No Appointments Found</h3>
                  <p className="text-gray-500 mb-6">
                    {showEmptyState
                      ? 'Start by adding your first appointment.'
                      : 'Try adjusting your search or filters.'}
                  </p>
                  <Button className="bg-[#2F80ED] hover:bg-[#2F80ED]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {paginatedAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <Card className="hover:shadow-lg transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-lg shadow-md">
                              {appointment.patient.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <h3 className="text-lg text-[#333333] font-medium mb-1">
                                {appointment.patient}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {appointment.doctor}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {appointment.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {appointment.patientPhone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className="px-3 py-1 text-xs bg-gray-50"
                            >
                              {appointment.type}
                            </Badge>
                            <Badge
                              className={`px-3 py-1 text-xs ${
                                appointment.status === 'confirmed'
                                  ? 'bg-[#27AE60]/10 text-[#27AE60]'
                                  : appointment.status === 'pending'
                                  ? 'bg-[#F2994A]/10 text-[#F2994A]'
                                  : appointment.status === 'completed'
                                  ? 'bg-[#2F80ED]/10 text-[#2F80ED]'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {appointment.status}
                            </Badge>
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DevControls
        onEmptyStateToggle={() => setShowEmptyState(!showEmptyState)}
        onLargeDataToggle={() => setShowLargeDataset(!showLargeDataset)}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {filteredAppointments.length > itemsPerPage && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
      />
    </div>
  );
}