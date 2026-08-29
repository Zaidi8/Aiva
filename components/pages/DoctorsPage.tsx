'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Stethoscope,
  Phone,
  Mail,
  CalendarClock,
  Pencil,
  UserX,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SectionCard } from '../ui/section-card';
import { EmptyState } from '../ui/empty-state';
import { TopBar } from '../ui/TopBar';
import { PaginationBar } from '../ui/PaginationBar';
import { AddDoctorModal } from '../ui/AddDoctorModal';
import { DoctorScheduleModal } from '../ui/DoctorScheduleModal';
import { apiDelete, ApiError } from '@/lib/client/fetcher';
import type { Doctor } from '@prisma/client';

interface DoctorsPageProps {
  initialDoctors: Doctor[];
  initialTotal: number;
  initialQuery?: string;
}

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function DoctorsPage({
  initialDoctors,
  initialQuery = '',
}: DoctorsPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const refresh = () => startTransition(() => router.refresh());

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialDoctors;
    return initialDoctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q),
    );
  }, [initialDoctors, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDoctors.length / itemsPerPage),
  );
  const paginated = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleDeactivate = async (doctor: Doctor) => {
    if (
      !window.confirm(
        `Deactivate ${doctor.name}? They’ll stop appearing in booking and the AI receptionist. Past appointments are kept.`,
      )
    ) {
      return;
    }
    try {
      await apiDelete(`/api/doctors/${doctor.id}`);
      toast.success(`${doctor.name} deactivated`);
      refresh();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to deactivate doctor.',
      );
    }
  };

  return (
    <div>
      <TopBar
        title="Doctors"
        description="Manage your clinic’s doctors and their working hours"
        actionButton={
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus />
            Add doctor
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctors by name or specialization…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Doctors list */}
        {paginated.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={<Stethoscope />}
              title="No doctors yet"
              description={
                initialDoctors.length === 0
                  ? 'Add your first doctor to start taking appointments. You’ll set their weekly working hours right after — that’s what powers booking and the AI receptionist.'
                  : 'No doctors match your search.'
              }
              action={
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus />
                  Add doctor
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <SectionCard noPadding>
            <ul className="divide-y divide-border">
              {paginated.map((doctor) => (
                <li
                  key={doctor.id}
                  className="p-6 transition-colors hover:bg-muted/60"
                >
                  <div className="flex flex-wrap items-start gap-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-muted text-lg font-semibold text-primary">
                      {initials(doctor.name)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {doctor.name}
                          </h3>
                          <p className="mt-0.5 text-sm font-medium text-primary">
                            {doctor.specialization}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScheduleDoctor(doctor)}
                          >
                            <CalendarClock />
                            Manage schedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditDoctor(doctor)}
                          >
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeactivate(doctor)}
                          >
                            <UserX />
                            Deactivate
                          </Button>
                        </div>
                      </div>

                      {(doctor.phone || doctor.email) && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {doctor.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="size-4" />
                              {doctor.phone}
                            </div>
                          )}
                          {doctor.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="size-4" />
                              {doctor.email}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {filteredDoctors.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredDoctors.length}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        )}

        {isPending && (
          <p className="text-center text-sm text-muted-foreground">
            Refreshing…
          </p>
        )}
      </div>

      <AddDoctorModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={refresh}
      />

      <AddDoctorModal
        isOpen={!!editDoctor}
        doctor={editDoctor}
        onClose={() => setEditDoctor(null)}
        onSaved={refresh}
      />

      <DoctorScheduleModal
        isOpen={!!scheduleDoctor}
        doctor={scheduleDoctor}
        onClose={() => setScheduleDoctor(null)}
        onSaved={refresh}
      />
    </div>
  );
}
