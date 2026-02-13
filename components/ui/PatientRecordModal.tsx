import { toast } from 'sonner';
import { useState } from 'react';
import { User, Phone, Calendar, Edit2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { Label } from './label';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { motion, AnimatePresence } from 'motion/react';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  lastVisit: string;
  upcomingAppointment?: string;
  medicalHistory: string[];
}

interface PatientRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export function PatientRecordModal({ isOpen, onClose, patient }: PatientRecordModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!patient) return null;

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    toast.success('Patient record updated successfully');
    setIsEditing(false);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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
                <DialogTitle className="text-xl">Patient Record</DialogTitle>
                <DialogDescription className="text-sm">
                  Complete patient information and medical history
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-xl shadow-md">
                    {patient.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-lg text-[#333333] font-medium">{patient.name}</h2>
                    <p className="text-sm text-gray-600">{patient.age} years • {patient.gender}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="text-sm text-[#333333] font-medium">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Visit</p>
                    <p className="text-sm text-[#333333] font-medium">{patient.lastVisit}</p>
                  </div>
                </div>

                {patient.upcomingAppointment && (
                  <div className="p-3 bg-[#27AE60]/10 rounded-lg border border-[#27AE60]/20">
                    <p className="text-xs text-gray-500 mb-1">Upcoming Appointment</p>
                    <p className="text-sm text-[#27AE60] font-medium">{patient.upcomingAppointment}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 mb-2">Medical History</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalHistory.map((condition: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button variant="outline" onClick={handleClose} size="sm" className="w-full text-xs">
                      Close
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={handleEdit}
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit Patient
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
                  Edit Patient
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Update patient information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-name" className="text-xs">Full Name</Label>
                  <Input id="edit-name" defaultValue={patient.name} className="h-10 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-age" className="text-xs">Age</Label>
                    <Input id="edit-age" type="number" defaultValue={patient.age} className="h-10 text-sm" />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-gender" className="text-xs">Gender</Label>
                    <Select defaultValue={patient.gender}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
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
                  <Label htmlFor="edit-phone" className="text-xs">Phone Number</Label>
                  <Input id="edit-phone" defaultValue={patient.phone} className="h-10 text-sm" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-medical-history" className="text-xs">Medical History</Label>
                  <Input
                    id="edit-medical-history"
                    defaultValue={patient.medicalHistory.join(', ')}
                    className="h-10 text-sm"
                    placeholder="e.g., Hypertension, Diabetes"
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
                      onClick={handleSaveEdit}
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
