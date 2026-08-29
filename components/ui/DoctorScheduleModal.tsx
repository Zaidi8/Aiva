'use client';

import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Checkbox } from './checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from './utils';
import { Trash2, Plus, CalendarOff } from 'lucide-react';
import {
  apiGet,
  apiPut,
  apiPost,
  apiDelete,
  ApiError,
} from '@/lib/client/fetcher';
import type { Doctor, DoctorSchedule, DoctorTimeOff } from '@prisma/client';

interface DoctorScheduleModalProps {
  isOpen: boolean;
  doctor: Doctor | null;
  onClose: () => void;
  onSaved?: () => void;
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

interface DayRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

const DEFAULT_ROW: DayRow = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: 30,
};

// A sensible default working week (Mon–Fri 9–5) used when a doctor has no
// schedule yet, so the admin starts from something rather than a blank grid.
function defaultWeek(): DayRow[] {
  return DAYS.map((_, dow) => ({
    ...DEFAULT_ROW,
    enabled: dow >= 1 && dow <= 5,
  }));
}

export function DoctorScheduleModal({
  isOpen,
  doctor,
  onClose,
  onSaved,
}: DoctorScheduleModalProps) {
  const [rows, setRows] = useState<DayRow[]>(defaultWeek);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const [timeOff, setTimeOff] = useState<DoctorTimeOff[]>([]);
  const [toStart, setToStart] = useState('');
  const [toEnd, setToEnd] = useState('');
  const [toReason, setToReason] = useState('');
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const doctorId = doctor?.id;
  const enabledCount = rows.filter((r) => r.enabled).length;

  const hydrate = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setRowErrors({});
    try {
      // Sequential, not parallel — the pooled DB is connection_limit=1.
      const schedule = await apiGet<{ days: DoctorSchedule[] }>(
        `/api/doctors/${doctorId}/schedule`,
      );
      const off = await apiGet<{ items: DoctorTimeOff[] }>(
        `/api/doctors/${doctorId}/time-off`,
      );
      if (schedule.days.length > 0) {
        const next = defaultWeek().map((r) => ({ ...r, enabled: false }));
        for (const d of schedule.days) {
          next[d.dayOfWeek] = {
            enabled: true,
            startTime: d.startTime,
            endTime: d.endTime,
            slotDurationMinutes: d.slotDurationMinutes,
          };
        }
        setRows(next);
      } else {
        setRows(defaultWeek());
      }
      setTimeOff(off.items);
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to load schedule.',
      );
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isOpen && doctorId) {
      hydrate();
    }
    if (!isOpen) {
      setToStart('');
      setToEnd('');
      setToReason('');
    }
  }, [isOpen, doctorId, hydrate]);

  const updateRow = (dow: number, patch: Partial<DayRow>) => {
    setRows((prev) => prev.map((r, i) => (i === dow ? { ...r, ...patch } : r)));
  };

  const handleSaveSchedule = async () => {
    if (!doctorId) return;
    setRowErrors({});
    const days = rows
      .map((r, dayOfWeek) => ({ ...r, dayOfWeek }))
      .filter((r) => r.enabled)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotDurationMinutes: r.slotDurationMinutes,
      }));

    // Local guard mirroring the server: end must beat start.
    const localErrors: Record<number, string> = {};
    for (const d of days) {
      if (d.startTime >= d.endTime) {
        localErrors[d.dayOfWeek] = 'End time must be after start time.';
      }
    }
    if (Object.keys(localErrors).length > 0) {
      setRowErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      await apiPut(`/api/doctors/${doctorId}/schedule`, { days });
      toast.success('Working hours saved', {
        description: 'This doctor can now be booked during these hours.',
      });
      onSaved?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        // Field paths look like "days.2.endTime" — map back to the day row.
        const next: Record<number, string> = {};
        for (const [key, errs] of Object.entries(e.fields)) {
          const m = key.match(/^days\.(\d+)\./);
          if (m) {
            const idx = Number(m[1]);
            const dow = days[idx]?.dayOfWeek;
            if (dow != null) next[dow] = errs[0];
          } else {
            toast.error(errs[0]);
          }
        }
        setRowErrors(next);
        if (Object.keys(next).length > 0) {
          toast.error('Please fix the highlighted days.');
        }
      } else {
        toast.error(
          e instanceof ApiError ? e.message : 'Failed to save schedule.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddTimeOff = async () => {
    if (!doctorId) return;
    if (!toStart || !toEnd) {
      toast.error('Pick both a start and end date.');
      return;
    }
    setAddingTimeOff(true);
    try {
      await apiPost(`/api/doctors/${doctorId}/time-off`, {
        startDate: toStart,
        endDate: toEnd,
        reason: toReason || undefined,
      });
      toast.success('Time off added');
      setToStart('');
      setToEnd('');
      setToReason('');
      await hydrate();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to add time off.');
    } finally {
      setAddingTimeOff(false);
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!doctorId) return;
    try {
      await apiDelete(`/api/doctors/${doctorId}/time-off/${id}`);
      setTimeOff((prev) => prev.filter((t) => t.id !== id));
      onSaved?.();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to remove time off.',
      );
    }
  };

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0 text-left">
          <DialogTitle>
            Schedule{doctor ? ` · ${doctor.name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Set weekly working hours and time off. This drives booking and the
            AI receptionist.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-sm text-muted-foreground">
            Loading schedule…
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              {/* Weekly grid */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Weekly working hours
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {enabledCount} {enabledCount === 1 ? 'day' : 'days'} open
                  </span>
                </div>

                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {rows.map((row, dow) => (
                    <div
                      key={dow}
                      className={cn(
                        'px-3 py-2.5 transition-colors',
                        row.enabled ? 'bg-card' : 'bg-muted/50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2.5 w-32 shrink-0 cursor-pointer">
                          <Checkbox
                            checked={row.enabled}
                            onCheckedChange={(v) =>
                              updateRow(dow, { enabled: !!v })
                            }
                          />
                          <span
                            className={cn(
                              'text-sm',
                              row.enabled
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {DAYS[dow]}
                          </span>
                        </label>

                        {row.enabled ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={row.startTime}
                                onChange={(e) =>
                                  updateRow(dow, { startTime: e.target.value })
                                }
                                className="h-9 w-[118px]"
                              />
                              <span className="text-muted-foreground text-xs">
                                to
                              </span>
                              <Input
                                type="time"
                                value={row.endTime}
                                onChange={(e) =>
                                  updateRow(dow, { endTime: e.target.value })
                                }
                                className="h-9 w-[118px]"
                              />
                            </div>

                            <Select
                              value={String(row.slotDurationMinutes)}
                              onValueChange={(v) =>
                                updateRow(dow, {
                                  slotDurationMinutes: Number(v),
                                })
                              }
                            >
                              <SelectTrigger className="h-9 w-[112px] ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SLOT_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={String(m)}>
                                    {m} min
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not working
                          </span>
                        )}
                      </div>

                      {rowErrors[dow] && (
                        <p className="text-xs text-destructive mt-1.5 ml-[136px]">
                          {rowErrors[dow]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Time off */}
              <section>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Time off
                </h4>

                {timeOff.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                    <CalendarOff className="size-4" />
                    No time off scheduled.
                  </div>
                ) : (
                  <div className="space-y-2 mb-3">
                    {timeOff.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                      >
                        <div className="text-sm">
                          <span className="text-foreground">
                            {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                          </span>
                          {t.reason && (
                            <span className="text-muted-foreground">
                              {' '}
                              · {t.reason}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-destructive-muted hover:text-destructive"
                          onClick={() => handleDeleteTimeOff(t.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2 flex-wrap mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="to-start" className="text-xs">
                      From
                    </Label>
                    <Input
                      id="to-start"
                      type="date"
                      value={toStart}
                      onChange={(e) => setToStart(e.target.value)}
                      className="h-9 w-[150px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="to-end" className="text-xs">
                      To
                    </Label>
                    <Input
                      id="to-end"
                      type="date"
                      value={toEnd}
                      onChange={(e) => setToEnd(e.target.value)}
                      className="h-9 w-[150px]"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[120px]">
                    <Label htmlFor="to-reason" className="text-xs">
                      Reason (optional)
                    </Label>
                    <Input
                      id="to-reason"
                      value={toReason}
                      onChange={(e) => setToReason(e.target.value)}
                      placeholder="Vacation"
                      className="h-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={handleAddTimeOff}
                    disabled={addingTimeOff}
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
              </section>
            </div>

            {/* Sticky footer — the primary action is always reachable. */}
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0 sm:justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Times are in the clinic’s timezone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSchedule} disabled={saving}>
                  {saving ? 'Saving…' : 'Save working hours'}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
