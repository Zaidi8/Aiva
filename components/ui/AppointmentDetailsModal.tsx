import { toast } from 'sonner';
import { useState } from 'react';
import { Calendar, Clock, User, MessageSquare, CheckCircle, X, Edit2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { StatusBadge } from './status-badge';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';
import { Calendar as CalendarPicker } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  time: string;
  date: string;
  type: string;
  status: string;
  patientPhone: string;
  notes?: string;
}

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export function AppointmentDetailsModal({ isOpen, onClose, appointment }: AppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('');

  if (!appointment) return null;

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleReschedule = () => {
    setIsEditing(true);
  };

  const handleSaveReschedule = () => {
    toast.success('Appointment rescheduled successfully');
    setIsEditing(false);
    onClose();
  };

  const handleMarkComplete = () => {
    toast.success(`Appointment with ${appointment.patient} marked as complete`);
    onClose();
  };

  const handleCancel = () => {
    toast.error(`Appointment with ${appointment.patient} has been cancelled`);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedDoctor(appointment.doctor);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {!isEditing ? (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Appointment details
              </DialogTitle>
              <DialogDescription>
                View and manage appointment information
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Patient Info */}
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-base font-medium text-primary-foreground">
                  {appointment.patient.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground">{appointment.patient}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {appointment.patientPhone}
                    </span>
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              {/* Appointment Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Doctor</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    <User className="size-3.5 text-primary" />
                    <span className="text-sm text-foreground">{appointment.doctor}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Appointment type</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    <Calendar className="size-3.5 text-primary" />
                    <span className="text-sm text-foreground">{appointment.type}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Date</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    <Calendar className="size-3.5 text-primary" />
                    <span className="text-sm text-foreground">{appointment.date}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Time</Label>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    <Clock className="size-3.5 text-primary" />
                    <span className="text-sm text-foreground">{appointment.time}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                    {appointment.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-border pt-4">
                <Button
                  onClick={handleReschedule}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit2 />
                  Reschedule
                </Button>
                <Button onClick={handleMarkComplete} className="flex-1">
                  <CheckCircle />
                  Mark complete
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive-muted hover:text-destructive"
                >
                  <X />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" />
                Reschedule appointment
              </DialogTitle>
              <DialogDescription>
                Update appointment date and time
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="time">Time</Label>
                  <Select defaultValue={appointment.time}>
                    <SelectTrigger id="time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">09:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="14:00">02:00 PM</SelectItem>
                      <SelectItem value="15:00">03:00 PM</SelectItem>
                      <SelectItem value="16:00">04:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doctor">Doctor</Label>
                <Select value={selectedDoctor || appointment.doctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger id="doctor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Williams">Dr. Williams</SelectItem>
                    <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                    <SelectItem value="Dr. Brown">Dr. Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  defaultValue={appointment.notes}
                  rows={2}
                />
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveReschedule} className="flex-1">
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
