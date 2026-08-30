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
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { StatusBadge } from '../ui/status-badge';
import { SectionCard } from '../ui/section-card';
import { EmptyState } from '../ui/empty-state';
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
import { apiPatch, ApiError } from '@/lib/client/fetcher';
import { toast } from 'sonner';
import { NewAppointmentModal } from '../ui/NewAppointmentModal';
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

interface AppointmentsPageProps {
  initialAppointments: AppointmentRow[];
  initialTotals: { total: number; confirmed: number; pending: number };
  onNavigate?: (page: string) => void;
  // False for Doctor logins — read-only schedule view (RBAC: appointment:write).
  canWrite?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function isSameLocalDay(isoA: string, dateB: Date): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

// Full-width layout overrides for the calendar; colors come from the
// Calendar component's own token-based defaults (bg-primary selection, etc.).
const calendarClassNames = {
  months: 'w-full',
  month: 'w-full space-y-4',
  caption: 'flex justify-center pt-1 relative items-center',
  caption_label: 'text-sm font-medium',
  table: 'w-full border-collapse',
  head_row: 'flex w-full',
  head_cell:
    'text-muted-foreground rounded-md w-full font-normal text-[0.7rem] uppercase tracking-wide',
  row: 'flex w-full mt-2',
  cell: 'relative w-full p-0 text-center text-sm',
  day: 'h-9 w-full p-0 font-normal rounded-md',
  day_outside: 'text-muted-foreground opacity-50',
};

export function AppointmentsPage({
  initialAppointments,
  initialTotals,
  canWrite = true,
}: AppointmentsPageProps) {
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

  const confirmAppointment = async (id: string, patientName: string) => {
    try {
      await apiPatch(`/api/appointments/${id}`, { status: 'Confirmed' });
      toast.success(`${patientName}'s appointment confirmed.`);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not confirm appointment.',
      );
    }
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

  const summaryTiles = [
    {
      label: 'Total (selected day)',
      value: dateScoped.length,
      icon: CalendarIcon,
      tile: 'bg-primary-muted',
      iconColor: 'text-primary',
    },
    {
      label: 'Confirmed',
      value: dateScopedConfirmed,
      icon: Clock,
      tile: 'bg-success-muted',
      iconColor: 'text-success',
    },
    {
      label: 'Pending',
      value: dateScopedPending,
      icon: Clock,
      tile: 'bg-warning-muted',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div>
      <TopBar
        title="Appointments"
        actionButton={
          canWrite ? (
            <Button onClick={() => setIsNewAppointmentModalOpen(true)}>
              <Plus />
              New appointment
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Calendar + summary */}
        <SectionCard>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <CalendarIcon className="size-5 text-primary" />
                Calendar
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full p-0"
                classNames={calendarClassNames}
              />
            </div>

            <div>
              <h3 className="mb-1 text-base font-semibold text-foreground">
                Summary
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="space-y-3">
                {summaryTiles.map((tile) => {
                  const TileIcon = tile.icon;
                  return (
                    <div
                      key={tile.label}
                      className={`flex items-center justify-between rounded-lg p-4 ${tile.tile}`}
                    >
                      <div className="flex items-center gap-2">
                        <TileIcon className={`size-5 ${tile.iconColor}`} />
                        <span className="text-sm font-medium text-foreground">
                          {tile.label}
                        </span>
                      </div>
                      <span className="text-2xl font-semibold tracking-tight text-foreground">
                        {tile.value}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Showing {initialTotals.total} appointments overall ·{' '}
                {initialTotals.confirmed} confirmed · {initialTotals.pending}{' '}
                pending.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients or doctors…"
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
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Appointments list */}
        {paginatedAppointments.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={<CalendarIcon />}
              title={
                initialAppointments.length === 0
                  ? 'No appointments yet'
                  : 'No appointments match'
              }
              description={
                initialAppointments.length === 0
                  ? 'Schedule your first appointment to get started.'
                  : 'Try adjusting your search or status filter.'
              }
              action={
                canWrite ? (
                  <Button onClick={() => setIsNewAppointmentModalOpen(true)}>
                    <Plus />
                    Add appointment
                  </Button>
                ) : undefined
              }
            />
          </SectionCard>
        ) : (
          <SectionCard noPadding>
            <ul className="divide-y divide-border">
              {paginatedAppointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-semibold text-primary">
                      {initials(appointment.patient.fullName)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-foreground">
                        {appointment.patient.fullName}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-4" />
                          {appointment.doctor.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-4" />
                          {formatTime(appointment.scheduledAt)}
                        </span>
                        <span className="text-muted-foreground/70">
                          {formatDate(appointment.scheduledAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{appointment.type}</Badge>
                    <StatusBadge status={appointment.status} />
                    {appointment.status === 'Pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          confirmAppointment(
                            appointment.id,
                            appointment.patient.fullName,
                          )
                        }
                      >
                        <Check />
                        Approve
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {/* Pagination */}
      {filteredAppointments.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 pb-6">
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

      {canWrite && (
        <NewAppointmentModal
          isOpen={isNewAppointmentModalOpen}
          onClose={() => setIsNewAppointmentModalOpen(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
