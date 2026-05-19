'use client';

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { Label } from './label';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { motion, AnimatePresence } from 'motion/react';
import type { Patient as PrismaPatient } from '@prisma/client';
import {
  updatePatientSchema,
  type UpdatePatientInput,
} from '@/lib/validations/patient';
import { apiDelete, apiPatch, ApiError } from '@/lib/client/fetcher';

interface PatientRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PrismaPatient | null;
  // Notify the parent after a successful PATCH/DELETE so it can router.refresh()
  // to re-pull the server-rendered list.
  onMutated?: () => void;
}

interface EditFormValues {
  fullName: string;
  phoneNumber: string;
  age?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  email?: string;
  address?: string;
  medicalHistoryText?: string;
}

// Build a date string ("Jan 5, 2026") for display.
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PatientRecordModal({
  isOpen,
  onClose,
  patient,
  onMutated,
}: PatientRecordModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Two-step delete confirmation: first click arms the confirm button,
  // second click within ~3s actually fires the DELETE.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(updatePatientSchema as unknown as never),
    mode: 'onBlur',
  });

  // Whenever the modal opens (or the selected patient changes), reset the
  // form to the current patient's values so the inputs always reflect the
  // latest server state.
  useEffect(() => {
    if (!patient) return;
    form.reset({
      fullName: patient.fullName,
      phoneNumber: patient.phoneNumber,
      age: patient.age != null ? String(patient.age) : '',
      gender: (patient.gender ?? '') as EditFormValues['gender'],
      email: patient.email ?? '',
      address: patient.address ?? '',
      medicalHistoryText: patient.medicalHistory?.join(', ') ?? '',
    });
  }, [patient, form, isEditing]);

  // Reset edit/delete UI whenever the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setConfirmDelete(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!patient) return null;

  const handleClose = () => {
    setIsEditing(false);
    setConfirmDelete(false);
    onClose();
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancelEdit = () => setIsEditing(false);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: UpdatePatientInput = {
      fullName: values.fullName?.trim() || undefined,
      phoneNumber: values.phoneNumber?.trim() || undefined,
      age:
        values.age && values.age !== ''
          ? Number(values.age)
          : undefined,
      gender: values.gender ? values.gender : undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      medicalHistory:
        values.medicalHistoryText
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
    };

    try {
      await apiPatch(`/api/patients/${patient.id}`, payload);
      toast.success('Patient updated');
      setIsEditing(false);
      onClose();
      onMutated?.();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [key, errs] of Object.entries(e.fields)) {
          const formKey =
            key === 'medicalHistory' ? 'medicalHistoryText' : key;
          form.setError(formKey as keyof EditFormValues, {
            message: errs[0],
          });
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  const handleDelete = async () => {
    if (!confirmDelete) {
      // First click arms the action. Auto-revert after 3 s.
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setIsDeleting(true);
    try {
      await apiDelete(`/api/patients/${patient.id}`);
      toast.success('Patient deleted');
      onClose();
      onMutated?.();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Failed to delete patient. Try again.');
      }
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : handleClose())}>
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
                    {patient.fullName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg text-[#333333] font-medium">
                      {patient.fullName}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {patient.age != null ? `${patient.age} years` : 'Age unknown'}
                      {patient.gender ? ` • ${patient.gender}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="text-sm text-[#333333] font-medium">
                      {patient.phoneNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Added</p>
                    <p className="text-sm text-[#333333] font-medium">
                      {formatDate(patient.createdAt)}
                    </p>
                  </div>
                  {patient.email && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm text-[#333333] font-medium break-all">
                        {patient.email}
                      </p>
                    </div>
                  )}
                  {patient.address && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm text-[#333333] font-medium">
                        {patient.address}
                      </p>
                    </div>
                  )}
                </div>

                {patient.medicalHistory && patient.medicalHistory.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Medical History</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.medicalHistory.map(
                        (condition: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {condition}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      size="sm"
                      className={`text-xs ${
                        confirmDelete
                          ? 'border-red-500 text-red-600 hover:bg-red-50'
                          : ''
                      }`}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {isDeleting
                        ? 'Deleting...'
                        : confirmDelete
                          ? 'Click to confirm'
                          : 'Delete'}
                    </Button>
                  </motion.div>
                  <div className="flex-1" />
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      size="sm"
                      className="text-xs"
                    >
                      Close
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleEdit}
                      size="sm"
                      className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
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

              <form onSubmit={onSubmit} className="space-y-3 mt-3" noValidate>
                <div className="space-y-1">
                  <Label htmlFor="edit-fullName" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="edit-fullName"
                    className="h-10 text-sm"
                    aria-invalid={!!form.formState.errors.fullName}
                    {...form.register('fullName')}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-age" className="text-xs">
                      Age
                    </Label>
                    <Input
                      id="edit-age"
                      type="number"
                      className="h-10 text-sm"
                      aria-invalid={!!form.formState.errors.age}
                      {...form.register('age')}
                    />
                    {form.formState.errors.age && (
                      <p className="text-xs text-red-600">
                        {form.formState.errors.age.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-gender" className="text-xs">
                      Gender
                    </Label>
                    <Select
                      value={form.watch('gender') ?? ''}
                      onValueChange={(val) =>
                        form.setValue(
                          'gender',
                          (val || '') as EditFormValues['gender'],
                          { shouldValidate: true },
                        )
                      }
                    >
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
                  <Label htmlFor="edit-phoneNumber" className="text-xs">
                    Phone Number
                  </Label>
                  <Input
                    id="edit-phoneNumber"
                    className="h-10 text-sm"
                    aria-invalid={!!form.formState.errors.phoneNumber}
                    {...form.register('phoneNumber')}
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    className="h-10 text-sm"
                    aria-invalid={!!form.formState.errors.email}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-address" className="text-xs">
                    Address
                  </Label>
                  <Input
                    id="edit-address"
                    className="h-10 text-sm"
                    {...form.register('address')}
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="edit-medical-history"
                    className="text-xs"
                  >
                    Medical History
                  </Label>
                  <Input
                    id="edit-medical-history"
                    className="h-10 text-sm"
                    placeholder="e.g., Hypertension, Diabetes"
                    {...form.register('medicalHistoryText')}
                  />
                  <p className="text-[10px] text-gray-500">
                    Separate multiple conditions with commas.
                  </p>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
