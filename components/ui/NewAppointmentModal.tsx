'use client';

// NewAppointmentModal — schedule a real appointment via /api/appointments.
//
// Inputs (all live API-backed):
//   • Patient: typeahead picker against /api/patients?q=… (debounced).
//   • Doctor: dropdown populated from /api/doctors on mount. Empty list
//     surfaces a helpful "Add a doctor first" hint (no fictional Dr. Williams).
//   • Date: native shadcn Calendar.
//   • Time: list of bookable slots from /api/availability for the chosen
//     (doctor, date). Re-fetched whenever doctor or date changes.
//   • Type: AppointmentType enum (Checkup / Consultation / FollowUp / Emergency).
//   • Notes: optional free text.
//
// Submission POSTs to /api/appointments. The DB has a unique constraint on
// (doctorId, scheduledAt); collisions surface as 409 from the API and we
// translate to a friendly inline error on the time picker.

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarIcon, Search, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiGet, apiPost, ApiError } from '@/lib/client/fetcher';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional callback after a successful create — page wrappers use this to
  // trigger router.refresh() so the appointment list updates.
  onCreated?: () => void;
}

interface ApiDoctor {
  id: string;
  name: string;
  specialization: string;
}

interface ApiPatient {
  id: string;
  fullName: string;
  phoneNumber: string;
}

interface AvailabilitySlot {
  start: string; // ISO UTC
  end: string;
}

const APPOINTMENT_TYPES = [
  { value: 'Checkup', label: 'General Checkup' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'FollowUp', label: 'Follow-up' },
  { value: 'Emergency', label: 'Emergency' },
] as const;
type AppointmentTypeValue = (typeof APPOINTMENT_TYPES)[number]['value'];

function startOfDayUTC(d: Date): string {
  const x = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
  );
  return x.toISOString();
}
function endOfDayUTC(d: Date): string {
  const x = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
  );
  return x.toISOString();
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  onCreated,
}: NewAppointmentModalProps) {
  // ── Doctors ────────────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // ── Patient search ─────────────────────────────────────────────────────
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ApiPatient | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AppointmentTypeValue | ''>(
    '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset everything when the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setPatientQuery('');
      setPatients([]);
      setSelectedPatient(null);
      setSelectedDoctorId('');
      setDate(new Date());
      setSlots([]);
      setSelectedSlot('');
      setSelectedType('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  // Load doctors on open.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setDoctorsError(null);
    apiGet<{ items: ApiDoctor[]; total: number }>('/api/doctors?take=100')
      .then((res) => {
        if (cancelled) return;
        setDoctors(res.items);
      })
      .catch((e) => {
        if (cancelled) return;
        setDoctorsError(
          e instanceof Error ? e.message : 'Failed to load doctors.',
        );
      })
      .finally(() => {
        if (!cancelled) setDoctorsLoading(false);
      });
    setDoctorsLoading(true);
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Debounced patient search.
  useEffect(() => {
    if (!isOpen) return;
    const q = patientQuery.trim();
    let cancelled = false;
    const t = setTimeout(() => {
      apiGet<{ items: ApiPatient[]; total: number }>(
        `/api/patients?take=10${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      )
        .then((res) => {
          if (cancelled) return;
          setPatients(res.items);
        })
        .catch(() => {
          if (cancelled) return;
          setPatients([]);
        })
        .finally(() => {
          if (!cancelled) setPatientsLoading(false);
        });
    }, 200);
    setPatientsLoading(true);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [patientQuery, isOpen]);

  // Load availability whenever doctor or date changes.
  useEffect(() => {
    if (!isOpen || !selectedDoctorId || !date) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }
    let cancelled = false;
    const from = startOfDayUTC(date);
    const to = endOfDayUTC(date);
    apiGet<{ slots: AvailabilitySlot[] }>(
      `/api/availability?doctorId=${selectedDoctorId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setSelectedSlot('');
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    setSlotsLoading(true);
    return () => {
      cancelled = true;
    };
  }, [selectedDoctorId, date, isOpen]);

  const doctorEmpty = !doctorsLoading && doctors.length === 0;

  const patientList = useMemo(() => patients.slice(0, 8), [patients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!selectedPatient) nextErrors.patientId = 'Pick a patient.';
    if (!selectedDoctorId) nextErrors.doctorId = 'Pick a doctor.';
    if (!selectedSlot) nextErrors.slot = 'Pick an available time.';
    if (!selectedType) nextErrors.type = 'Pick an appointment type.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/appointments', {
        patientId: selectedPatient!.id,
        doctorId: selectedDoctorId,
        scheduledAt: selectedSlot,
        type: selectedType,
        notes: notes.trim() || undefined,
      });
      toast.success('Appointment created.', {
        description: 'The patient will receive a confirmation message.',
      });
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrors({
            slot: 'That slot was just booked by someone else. Pick another time.',
          });
          toast.error('Slot conflict — pick another time.');
        } else if (err.fields) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.fields)) {
            fieldErrors[k === 'scheduledAt' ? 'slot' : k] = v[0];
          }
          setErrors(fieldErrors);
          toast.error('Please fix the highlighted fields.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for a patient
          </DialogDescription>
        </DialogHeader>

        {doctorEmpty && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            You don&apos;t have any doctors set up yet. Add one in the Doctors
            section before booking an appointment.
          </div>
        )}
        {doctorsError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {doctorsError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          {/* ── Patient picker ── */}
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[#333333]">
                    {selectedPatient.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedPatient.phoneNumber}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery('');
                  }}
                  className="text-xs"
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="patient"
                    placeholder="Search by name or phone..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                {patientList.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-white shadow-sm">
                    {patientList.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                      >
                        <p className="font-medium text-[#333333]">{p.fullName}</p>
                        <p className="text-xs text-gray-500">{p.phoneNumber}</p>
                      </button>
                    ))}
                  </div>
                )}
                {patientList.length === 0 && !patientsLoading && (
                  <p className="text-xs text-gray-500">
                    No patients match. Add one in the Patients section first.
                  </p>
                )}
              </>
            )}
            {errors.patientId && (
              <p className="text-xs text-red-600">{errors.patientId}</p>
            )}
          </div>

          {/* ── Doctor picker ── */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            <Select
              value={selectedDoctorId}
              onValueChange={setSelectedDoctorId}
              disabled={doctorEmpty || doctorsLoading}
            >
              <SelectTrigger id="doctor">
                <SelectValue
                  placeholder={
                    doctorsLoading ? 'Loading...' : 'Select a doctor'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && (
              <p className="text-xs text-red-600">{errors.doctorId}</p>
            )}
          </div>

          {/* ── Date / Slot ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select
                value={selectedSlot}
                onValueChange={setSelectedSlot}
                disabled={
                  !selectedDoctorId || slotsLoading || slots.length === 0
                }
              >
                <SelectTrigger id="time">
                  <SelectValue
                    placeholder={
                      !selectedDoctorId
                        ? 'Pick a doctor first'
                        : slotsLoading
                          ? 'Loading...'
                          : slots.length === 0
                            ? 'No slots available'
                            : 'Select a time'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={s.start} value={s.start}>
                      {formatSlotTime(s.start)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.slot && (
                <p className="text-xs text-red-600">{errors.slot}</p>
              )}
              {selectedDoctorId &&
                !slotsLoading &&
                slots.length === 0 && (
                  <p className="text-[10px] text-gray-500">
                    Doctor has no availability on this day, or every slot is
                    already booked. Try another date.
                  </p>
                )}
            </div>
          </div>

          {/* ── Type ── */}
          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as AppointmentTypeValue)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-red-600">{errors.type}</p>
            )}
          </div>

          {/* ── Notes ── */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Any special notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || doctorEmpty}
              className="flex-1 bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90"
            >
              {submitting ? (
                'Creating...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Appointment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
