'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Users,
  Phone,
  Calendar,
  Eye,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { StatCard } from '../ui/stat-card';
import { SectionCard } from '../ui/section-card';
import { EmptyState } from '../ui/empty-state';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import { AddPatientModal } from '../ui/AddPatientModal';
import { PatientRecordModal } from '../ui/PatientRecordModal';
import DateRangePicker from '../ui/date-range-picker';
import type { Patient as PrismaPatient } from '@prisma/client';

interface PatientsPageProps {
  // Props supplied by the server-component wrapper at
  // app/(dashboard)/patients/page.tsx. Mutations (create/update/delete)
  // call router.refresh() which re-runs the server component and rehydrates
  // these props with fresh data — we never fetch on the client.
  initialPatients: PrismaPatient[];
  initialTotal: number;
  initialQuery?: string;
  onNavigate?: (page: string) => void;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

// Compact initials from a full name, used in the avatar bubble.
function initials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PatientsPage({
  initialPatients,
  initialTotal,
  initialQuery = '',
}: PatientsPageProps) {
  const router = useRouter();
  // useTransition keeps router.refresh() non-blocking so the UI stays
  // responsive while Next re-runs the server component.
  const [isPending, startTransition] = useTransition();

  // Client-side search is fine for the first page (≤50 rows); for richer
  // server-side filtering we could pipe the input into the ?q= param via
  // router.push, but the current scope is "swap data source", not "rebuild
  // search UX".
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PrismaPatient | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Re-fetch the server component after a mutation. The route is server-rendered
  // by app/(dashboard)/patients/page.tsx — router.refresh() invalidates the
  // cached RSC payload and replays the data fetch.
  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const filteredPatients = useMemo(() => {
    const source = showEmptyState ? [] : initialPatients;
    const q = searchQuery.trim().toLowerCase();
    return source.filter((patient) => {
      const matchesSearch =
        !q ||
        patient.fullName.toLowerCase().includes(q) ||
        patient.phoneNumber.toLowerCase().includes(q);
      const matchesDateRange =
        !dateRange.start || !dateRange.end
          ? true
          : (() => {
              const created = new Date(patient.createdAt).getTime();
              return (
                created >= new Date(dateRange.start).getTime() &&
                created <= new Date(dateRange.end).getTime()
              );
            })();
      return matchesSearch && matchesDateRange;
    });
  }, [initialPatients, showEmptyState, searchQuery, dateRange]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / itemsPerPage),
  );
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div>
      <TopBar
        title="Patient Records"
        description="Manage patient information and medical history"
        actionButton={
          <Button onClick={() => setIsAddPatientModalOpen(true)}>
            <Plus />
            Add patient
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Search and filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients by name or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Stats */}
        {!showEmptyState && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatCard
              label="Total patients"
              value={initialTotal}
              icon={<Users />}
              accent="primary"
              hint={isPending ? 'Updating…' : undefined}
            />
            <StatCard
              label="Showing"
              value={filteredPatients.length}
              icon={<Eye />}
              accent="info"
            />
            <StatCard
              label="Page"
              value={`${currentPage} / ${totalPages}`}
              icon={<LayoutGrid />}
              accent="teal"
            />
          </div>
        )}

        {/* Patients list */}
        {paginatedPatients.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={<Users />}
              title="No patients found"
              description={
                initialPatients.length === 0
                  ? 'Start by adding your first patient.'
                  : 'Try adjusting your search query.'
              }
              action={
                <Button onClick={() => setIsAddPatientModalOpen(true)}>
                  <Plus />
                  Add patient
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <SectionCard noPadding>
            <ul className="divide-y divide-border">
              {paginatedPatients.map((patient) => (
                <li key={patient.id} className="p-6 transition-colors hover:bg-muted/60">
                  <div className="flex flex-wrap items-start gap-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-muted text-lg font-semibold text-primary">
                      {initials(patient.fullName)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {patient.fullName}
                          </h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {patient.age != null
                              ? `${patient.age} years`
                              : 'Age unknown'}
                            {patient.gender ? ` · ${patient.gender}` : ''}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <Eye />
                          View full record
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="size-4" />
                          {patient.phoneNumber}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="size-4" />
                          Added {formatDate(patient.createdAt)}
                        </div>
                      </div>

                      {patient.medicalHistory &&
                        patient.medicalHistory.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            {patient.medicalHistory
                              .slice(0, 3)
                              .map((condition, i) => (
                                <Badge key={i} variant="secondary">
                                  {condition}
                                </Badge>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* Pagination */}
        {filteredPatients.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPatients.length}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <DevControls
        onEmptyStateToggle={() => setShowEmptyState(!showEmptyState)}
        onLargeDataToggle={() => {
          /* large dataset toggle is a mock-data only feature, disabled in live mode */
        }}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onCreated={refresh}
      />

      {/* Patient Full Record Modal */}
      <PatientRecordModal
        isOpen={!!selectedPatient}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onMutated={refresh}
      />
    </div>
  );
}
