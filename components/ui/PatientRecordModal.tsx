'use client';

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import type { Patient as PrismaPatient } from '@prisma/client';
import type { UpdatePatientInput } from '@/lib/validations/patient';
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

  // No resolver: the API zod schema has a different shape (typed
  // medicalHistory[], numeric age) than the form. Server-side 422 fields
  // are surfaced via form.setError below.
  const form = useForm<EditFormValues>({
    mode: 'onSubmit',
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

  const initials = patient.fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : handleClose())}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {!isEditing ? (
          <div>
            <DialogHeader>
              <DialogTitle>Patient record</DialogTitle>
              <DialogDescription>
                Complete patient information and medical history
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {patient.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {patient.age != null ? `${patient.age} years` : 'Age unknown'}
                    {patient.gender ? ` • ${patient.gender}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Phone number
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {patient.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Added</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(patient.createdAt)}
                  </p>
                </div>
                {patient.email && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium break-all text-foreground">
                      {patient.email}
                    </p>
                  </div>
                )}
                {patient.address && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">
                      Address
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {patient.address}
                    </p>
                  </div>
                )}
              </div>

              {patient.medicalHistory && patient.medicalHistory.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Medical history
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalHistory.map(
                      (condition: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {condition}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 border-t border-border pt-4">
                <Button
                  variant={confirmDelete ? 'destructive' : 'outline'}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 />
                  {isDeleting
                    ? 'Deleting…'
                    : confirmDelete
                      ? 'Click to confirm'
                      : 'Delete'}
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handleEdit}>
                  <Edit2 />
                  Edit patient
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" />
                Edit patient
              </DialogTitle>
              <DialogDescription>Update patient information</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="edit-fullName">Full name</Label>
                <Input
                  id="edit-fullName"
                  aria-invalid={!!form.formState.errors.fullName}
                  {...form.register('fullName')}
                />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-age">Age</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    aria-invalid={!!form.formState.errors.age}
                    {...form.register('age')}
                  />
                  {form.formState.errors.age && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.age.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender">Gender</Label>
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
                    <SelectTrigger id="edit-gender">
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

              <div className="space-y-1.5">
                <Label htmlFor="edit-phoneNumber">Phone number</Label>
                <Input
                  id="edit-phoneNumber"
                  aria-invalid={!!form.formState.errors.phoneNumber}
                  {...form.register('phoneNumber')}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" {...form.register('address')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-medical-history">Medical history</Label>
                <Input
                  id="edit-medical-history"
                  placeholder="e.g., Hypertension, Diabetes"
                  {...form.register('medicalHistoryText')}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple conditions with commas.
                </p>
              </div>

              <div className="mt-2 flex gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
