'use client';

// Appointments page — calendar + list + filters + New Appointment modal.
//
// Reads the first page of appointments from the server-component shell
// (app/(dashboard)/appointments/page.tsx) and lets the user search/filter on
// the client. Mutations (creating a new appointment via NewAppointmentModal)
// trigger router.refresh() which re-invokes the server component.
//
// The shape passed in is the JSON-safe form of AppointmentWithRelations —
// scheduledAt is an ISO string here, not a Date, so we re-parse in renderers.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { TopBar } from '../ui/TopBar';
import { PaginationBar } from '../ui/PaginationBar';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
import { motion } from 'motion/react';
import type { AppointmentStatus, AppointmentType } from '@prisma/client';

interface AppointmentRow {
  id: string;
  scheduledAt: string; // ISO
  durationMin: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  patient: { id: string; fullName: string; phoneNumber: string };
  doctor: { id: string; name: string; specialization: string };
}

interface ImprovedAppointmentsPageProps {
  initialAppointments: AppointmentRow[];
  initialTotals: { total: number; confirmed: number; pending: number };
  onNavigate?: (page: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isSameLocalDay(isoA: string, dateB: Date): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

function statusBadgeClass(status: AppointmentStatus): string {
  switch (status) {
    case 'Confirmed':
      return 'bg-[#27AE60]/10 text-[#27AE60]';
    case 'Pending':
      return 'bg-[#F2994A]/10 text-[#F2994A]';
    case 'Completed':
      return 'bg-[#2F80ED]/10 text-[#2F80ED]';
    case 'Cancelled':
    default:
      return 'bg-gray-200 text-gray-600';
  }
}

export function ImprovedAppointmentsPage({
  initialAppointments,
  initialTotals,
}: ImprovedAppointmentsPageProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  // Filter pipeline.
  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialAppointments.filter((apt) => {
      const matchesSearch =
        !q ||
        apt.patient.fullName.toLowerCase().includes(q) ||
        apt.doctor.name.toLowerCase().includes(q) ||
        apt.patient.phoneNumber.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || apt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialAppointments, searchQuery, statusFilter]);

  // Date-scoped subset for the calendar summary (independent of filters).
  const dateScoped = useMemo(() => {
    if (!selectedDate) return [];
    return initialAppointments.filter((a) =>
      isSameLocalDay(a.scheduledAt, selectedDate),
    );
  }, [initialAppointments, selectedDate]);

  const dateScopedConfirmed = dateScoped.filter(
    (a) => a.status === 'Confirmed',
  ).length;
  const dateScopedPending = dateScoped.filter(
    (a) => a.status === 'Pending',
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / itemsPerPage),
  );
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Appointments"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsNewAppointmentModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Calendar + tiles */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-[#333333] mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#2F80ED]" />
                    Calendar
                  </h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border-0 w-full"
                    classNames={{
                      months: 'w-full',
                      month: 'w-full',
                      caption: 'flex justify-center pt-1 relative items-center',
                      caption_label: 'text-sm font-medium',
                      nav: 'space-x-1 flex items-center',
                      nav_button:
                        'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                      table: 'w-full border-collapse mt-4',
                      head_row: 'flex w-full',
                      head_cell:
                        'text-gray-500 rounded-md w-full font-normal text-[10px]',
                      row: 'flex w-full mt-2',
                      cell: 'text-center text-sm p-0 relative w-full h-9',
                      day: 'h-9 w-full p-0 font-normal hover:bg-[#2F80ED]/10 rounded-full transition-colors text-sm',
                      day_selected:
                        'bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white hover:bg-gradient-to-r hover:from-[#2F80ED] hover:to-[#56CCF2] hover:text-white rounded-full',
                      day_today: 'bg-gray-100 text-gray-900 rounded-full',
                      day_outside: 'text-gray-400 opacity-50',
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#333333] mb-4">
                    Summary
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedDate?.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-[#2F80ED]/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#2F80ED]" />
                        <span className="text-sm text-gray-700 font-medium">
                          Total Appointments (selected day)
                        </span>
                      </div>
                      <span className="text-2xl font-semibold text-[#333333]">
                        {dateScoped.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#27AE60]/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#27AE60]" />
                        <span className="text-sm text-gray-700 font-medium">
                          Confirmed
                        </span>
                      </div>
                      <span className="text-2xl font-semibold text-[#333333]">
                        {dateScopedConfirmed}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#F2994A]/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#F2994A]" />
                        <span className="text-sm text-gray-700 font-medium">
                          Pending
                        </span>
                      </div>
                      <span className="text-2xl font-semibold text-[#333333]">
                        {dateScopedPending}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Showing {initialTotals.total} appointments overall ·{' '}
                    {initialTotals.confirmed} confirmed ·{' '}
                    {initialTotals.pending} pending.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Appointments list */}
        {paginatedAppointments.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">
                {initialAppointments.length === 0
                  ? 'No appointments yet'
                  : 'No appointments match'}
              </h3>
              <p className="text-gray-500 mb-6">
                {initialAppointments.length === 0
                  ? 'Schedule your first appointment to get started.'
                  : 'Try adjusting your search or status filter.'}
              </p>
              <Button
                className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                onClick={() => setIsNewAppointmentModalOpen(true)}
              >
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
                whileHover={{ scale: 1.01, x: 5 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-lg shadow-md">
                          {appointment.patient.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg text-[#333333] font-medium mb-1">
                            {appointment.patient.fullName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {appointment.doctor.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(appointment.scheduledAt)}
                            </span>
                            <span className="text-gray-400">
                              {new Date(
                                appointment.scheduledAt,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge
                          variant="outline"
                          className="px-3 py-1 text-xs bg-gray-50"
                        >
                          {appointment.type}
                        </Badge>
                        <Badge
                          className={`px-3 py-1 text-xs ${statusBadgeClass(appointment.status)}`}
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredAppointments.length > 0 && (
        <div className="px-6 pb-6 max-w-7xl mx-auto">
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAppointments.length}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
