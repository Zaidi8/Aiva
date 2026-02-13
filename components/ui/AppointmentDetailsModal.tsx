import { toast } from 'sonner';
import { useState } from 'react';
import { Calendar, Clock, User, MessageSquare, CheckCircle, X, Edit2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { Label } from './label';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';
import { Calendar as CalendarPicker } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { motion, AnimatePresence } from 'motion/react';
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
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.div
              key="view"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2F80ED]" />
                  Appointment Details
                </DialogTitle>
                <DialogDescription className="text-sm">
                  View and manage appointment information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Patient Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-base shadow-md">
                    {appointment.patient.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#333333]">{appointment.patient}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {appointment.patientPhone}
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={`px-2 py-1 text-xs ${
                      appointment.status === 'confirmed'
                        ? 'bg-[#27AE60]/10 text-[#27AE60]'
                        : appointment.status === 'pending'
                        ? 'bg-[#F2994A]/10 text-[#F2994A]'
                        : appointment.status === 'completed'
                        ? 'bg-[#2F80ED]/10 text-[#2F80ED]'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {appointment.status}
                  </Badge>
                </div>

                {/* Appointment Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Doctor</Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <User className="w-3 h-3 text-[#2F80ED]" />
                      <span className="text-sm text-[#333333]">{appointment.doctor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Appointment Type</Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-3 h-3 text-[#2F80ED]" />
                      <span className="text-sm text-[#333333]">{appointment.type}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Date</Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-3 h-3 text-[#2F80ED]" />
                      <span className="text-sm text-[#333333]">{appointment.date}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Time</Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Clock className="w-3 h-3 text-[#2F80ED]" />
                      <span className="text-sm text-[#333333]">{appointment.time}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Notes</Label>
                    <div className="p-2 bg-gray-50 rounded-lg text-xs text-[#333333]">
                      {appointment.notes}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleReschedule}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#2F80ED] text-[#2F80ED] hover:bg-[#2F80ED] hover:text-white text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Reschedule
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleMarkComplete}
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#27AE60] to-[#56CCF2] hover:opacity-90 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#EB5757] text-[#EB5757] hover:bg-[#EB5757] hover:text-white text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#2F80ED]" />
                  Reschedule Appointment
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Update appointment date and time
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left font-normal h-10 text-sm"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="time" className="text-xs">Time</Label>
                    <Select defaultValue={appointment.time}>
                      <SelectTrigger className="h-10 text-sm">
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

                <div className="space-y-1">
                  <Label htmlFor="doctor" className="text-xs">Doctor</Label>
                  <Select value={selectedDoctor || appointment.doctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr. Williams">Dr. Williams</SelectItem>
                      <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                      <SelectItem value="Dr. Brown">Dr. Brown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes..."
                    defaultValue={appointment.notes}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleSaveReschedule}
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
                    >
                      Save Changes
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}