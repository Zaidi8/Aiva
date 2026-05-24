'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, User, Phone, Calendar, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import { AddPatientModal } from '../ui/AddPatientModal';
import { PatientRecordModal } from '../ui/PatientRecordModal';
import DateRangePicker from '../ui/date-range-picker';
import { motion } from 'motion/react';
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
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Patient Records"
        description="Manage patient information and medical history"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsAddPatientModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Search and Filters */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search patients by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </motion.div>

        {/* Stats */}
        {!showEmptyState && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              {
                label: 'Total Patients',
                value: initialTotal,
                color: '#2F80ED',
              },
              {
                label: 'Showing',
                value: filteredPatients.length,
                color: '#27AE60',
              },
              {
                label: 'Page',
                value: `${currentPage} / ${totalPages}`,
                color: '#56CCF2',
              },
              {
                label: 'Refresh',
                value: isPending ? 'Loading...' : 'Ready',
                color: '#F2994A',
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer border-none">
                  <CardContent className="p-6">
                    <div
                      className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <User
                        className="w-5 h-5"
                        style={{ color: stat.color }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl text-[#333333]">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Patients List */}
        {paginatedPatients.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">No Patients Found</h3>
              <p className="text-gray-500 mb-6">
                {initialPatients.length === 0
                  ? 'Start by adding your first patient.'
                  : 'Try adjusting your search query.'}
              </p>
              <Button
                className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                onClick={() => setIsAddPatientModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 5 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6 flex-wrap">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-xl shadow-md flex-shrink-0">
                        {initials(patient.fullName)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-xl text-[#333333] font-medium mb-1">
                              {patient.fullName}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {patient.age != null
                                  ? `${patient.age} years`
                                  : 'Age unknown'}
                                {patient.gender ? ` • ${patient.gender}` : ''}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-[#2F80ED] hover:text-white transition-all"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Record
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {patient.phoneNumber}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            Added: {formatDate(patient.createdAt)}
                          </div>
                        </div>

                        {patient.medicalHistory &&
                          patient.medicalHistory.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {patient.medicalHistory
                                .slice(0, 3)
                                .map((condition, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {condition}
                                  </Badge>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
