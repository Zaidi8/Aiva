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
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TopBar } from '../ui/TopBar';
import { PaginationBar } from '../ui/PaginationBar';
import { AddDoctorModal } from '../ui/AddDoctorModal';
import { DoctorScheduleModal } from '../ui/DoctorScheduleModal';
import { apiDelete, ApiError } from '@/lib/client/fetcher';
import { motion } from 'motion/react';
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
  initialTotal,
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
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Doctors"
        description="Manage your clinic’s doctors and their working hours"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Doctor
          </Button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search doctors by name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </motion.div>

        {paginated.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">No doctors yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {initialDoctors.length === 0
                  ? 'Add your first doctor to start taking appointments. You’ll set their weekly working hours right after — that’s what powers booking and the AI receptionist.'
                  : 'No doctors match your search.'}
              </p>
              <Button
                className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Doctor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginated.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6 flex-wrap">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-xl shadow-md flex-shrink-0">
                        {initials(doctor.name)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-xl text-[#333333] font-medium mb-1">
                              {doctor.name}
                            </h3>
                            <p className="text-sm text-[#2F80ED]">
                              {doctor.specialization}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-[#2F80ED] hover:text-white transition-all"
                              onClick={() => setScheduleDoctor(doctor)}
                            >
                              <CalendarClock className="w-4 h-4 mr-2" />
                              Manage Schedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditDoctor(doctor)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-600 hover:text-white transition-all"
                              onClick={() => handleDeactivate(doctor)}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {doctor.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {doctor.phone}
                            </div>
                          )}
                          {doctor.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              {doctor.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
          <p className="text-center text-sm text-gray-400">Refreshing…</p>
        )}
        {initialTotal > 0 && (
          <p className="sr-only">{initialTotal} doctors total</p>
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
