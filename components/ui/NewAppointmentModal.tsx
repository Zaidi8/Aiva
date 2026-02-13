import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewAppointmentModal({ isOpen, onClose }: NewAppointmentModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Appointment created successfully!', {
      description: 'The patient will receive a confirmation message.',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for a patient
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="patient-name">Patient Name</Label>
            <Input id="patient-name" placeholder="John Smith" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-phone">Phone Number</Label>
            <Input id="patient-phone" placeholder="555-0101" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor} required>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dr-williams">Dr. Williams</SelectItem>
                <SelectItem value="dr-brown">Dr. Brown</SelectItem>
                <SelectItem value="dr-martinez">Dr. Martinez</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
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

          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Checkup</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="lab">Lab Results</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" placeholder="Any special notes..." />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90"
            >
              Create Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}