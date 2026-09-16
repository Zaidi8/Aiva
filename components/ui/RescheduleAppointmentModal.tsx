'use client';

// RescheduleAppointmentModal — move an existing appointment to a new slot via
// POST /api/appointments/[id]/reschedule.
//
// Mirrors NewAppointmentModal: the doctor is fixed to the appointment's current
// doctor, and the available times come from /api/availability for the chosen
// date. A 409 (slot just taken) surfaces as an inline error; a 409
// PATIENT_CONFLICT (same patient, same time, different doctor) shows a warning
// and lets the user proceed anyway — matching the voice agent.

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarIcon, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiGet, apiPost, ApiError } from '@/lib/client/fetcher';

export interface RescheduleTarget {
  id: string;
  scheduledAt: string; // ISO
  patientName: string;
  doctor: { id: string; name: string; specialization: string };
}

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: RescheduleTarget | null;
  // Invoked after a successful reschedule — pages call router.refresh() here.
  onRescheduled?: () => void;
}

interface AvailabilitySlot {
  start: string; // ISO UTC
  end: string;
}

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

export function RescheduleAppointmentModal({
  isOpen,
  onClose,
  target,
  onRescheduled,
}: RescheduleAppointmentModalProps) {
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  // Set when the API returns 409 PATIENT_CONFLICT — rescheduling here would put
  // this patient at the same time as an appointment with another doctor.
  const [conflictLines, setConflictLines] = useState<string[] | null>(null);

  // Reset whenever the modal opens for a fresh target.
  const key = target?.id ?? 'none';
  useEffect(() => {
    if (!isOpen) return;
    setDate(() => new Date(target?.scheduledAt || new Date()));
    setSlots([]);
    setSelectedSlot('');
    setSlotError(null);
    setConflictLines(null);
  }, [isOpen, key, target?.scheduledAt]);

  // Load availability for the chosen date (fixed to the current doctor).
  useEffect(() => {
    if (!isOpen || !target || !date) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }
    let cancelled = false;
    const from = startOfDayUTC(date);
    const to = endOfDayUTC(date);
    setSlotsLoading(true);
    apiGet<{ slots: AvailabilitySlot[] }>(
      `/api/availability?doctorId=${target.doctor.id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
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
    return () => {
      cancelled = true;
    };
  }, [isOpen, target, date]);

  const selectedDateDisplay = useMemo(
    () => (date ? format(date, 'PPP') : 'Pick a date'),
    [date],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!selectedSlot) {
      setSlotError('Pick an available time.');
      return;
    }
    setSlotError(null);
    setConflictLines(null);
    await submitReschedule(false);
  };

  const submitReschedule = async (confirmed: boolean) => {
    setSubmitting(true);
    try {
      await apiPost(`/api/appointments/${target!.id}/reschedule`, {
        scheduledAt: selectedSlot,
        ...(confirmed ? { confirm: true } : {}),
      });
      toast.success(`${target!.patientName}'s appointment rescheduled.`);
      onRescheduled?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.fields?.conflicts) {
          // Same patient, same time, different doctor — warn and offer to
          // proceed anyway, mirroring the voice agent's behavior.
          setConflictLines(err.fields.conflicts);
          toast.warning(
            'This patient already has an appointment at that time with another doctor.',
          );
        } else if (err.status === 409) {
          setSlotError(
            'That slot was just booked by someone else. Pick another time.',
          );
          toast.error('Slot conflict — pick another time.');
        } else {
          setSlotError(err.message);
          toast.error(err.message);
        }
      } else {
        setSlotError('Something went wrong. Try again.');
        toast.error('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            {target
              ? `Move ${target.patientName}'s appointment with ${target.doctor.name} to a new time.`
              : 'Update the appointment time.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4" noValidate>
          {/* ── Doctor (fixed) ── */}
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Select value={target?.doctor.id} disabled>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    target
                      ? `${target.doctor.name} · ${target.doctor.specialization}`
                      : ''
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {target && (
                  <SelectItem value={target.doctor.id}>
                    {target.doctor.name} · {target.doctor.specialization}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ── Date / Slot ── */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon />
                  {selectedDateDisplay}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
            <Label htmlFor="resched-time">Time</Label>
            <Select
              value={selectedSlot}
              onValueChange={setSelectedSlot}
              disabled={!date || slotsLoading || slots.length === 0}
            >
              <SelectTrigger id="resched-time">
                <SelectValue
                  placeholder={
                    slotsLoading
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
            {slotError && (
              <p className="text-xs text-destructive">{slotError}</p>
            )}
            {date && !slotsLoading && slots.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Doctor has no availability on this day, or every slot is already
                booked. Try another date.
              </p>
            )}
          </div>

          {conflictLines ? (
            <div className="space-y-3 pt-4">
              <div className="rounded-lg border border-warning bg-warning-muted px-3 py-2.5 text-xs">
                <p className="font-medium text-warning-muted-foreground">
                  This patient already has an appointment at the same time with
                  another doctor:
                </p>
                <ul className="mt-1 list-disc pl-4 text-warning-muted-foreground">
                  {conflictLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-1 text-warning-muted-foreground">
                  Reschedule anyway? This will leave the patient double-booked.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConflictLines(null)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Pick another time
                </Button>
                <Button
                  type="button"
                  onClick={() => submitReschedule(true)}
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Reschedule anyway'}
                </Button>
              </div>
            </div>
          ) : (
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
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? (
                  'Saving…'
                ) : (
                  <>
                    <Check />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}