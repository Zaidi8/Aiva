import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { useState } from 'react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const [selectedGender, setSelectedGender] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Patient added successfully!', {
      description: 'Patient record has been created.',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Patient</DialogTitle>
          <DialogDescription className="text-sm">
            Create a new patient record
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Full Name</Label>
            <Input id="name" placeholder="John Smith" required className="h-10 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="age" className="text-xs">Age</Label>
              <Input id="age" type="number" placeholder="35" required className="h-10 text-sm" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gender" className="text-xs">Gender</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender} required>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">Phone Number</Label>
            <Input id="phone" placeholder="555-0101" required className="h-10 text-sm" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="medical-history" className="text-xs">Medical History (Optional)</Label>
            <Input id="medical-history" placeholder="e.g., Hypertension, Diabetes" className="h-10 text-sm" />
          </div>

          <div className="flex gap-2 pt-3">
            <Button type="button" variant="outline" onClick={onClose} size="sm" className="flex-1 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1 bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
            >
              Add Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}