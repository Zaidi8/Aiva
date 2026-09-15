'use client';

import { toast } from 'sonner';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { apiPost, apiPatch, ApiError } from '@/lib/client/fetcher';
import type { Doctor } from '@prisma/client';

interface AddDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // When provided the modal is in EDIT mode (PATCH /api/doctors/[id]);
  // otherwise it CREATEs (POST /api/doctors).
  doctor?: Doctor | null;
  // Called after the API responds 2xx so the page can router.refresh().
  onSaved?: () => void;
}

interface DoctorFormValues {
  name: string;
  specialization: string;
  email?: string;
  phone?: string;
  experienceYears?: string;
}

const EMPTY_VALUES: DoctorFormValues = {
  name: '',
  specialization: '',
  email: '',
  phone: '',
  experienceYears: undefined,
};

export function AddDoctorModal({
  isOpen,
  onClose,
  doctor,
  onSaved,
}: AddDoctorModalProps) {
  const isEdit = !!doctor;
  const form = useForm<DoctorFormValues>({
    defaultValues: EMPTY_VALUES,
    mode: 'onSubmit',
  });

  // Hydrate the form when opening in edit mode; reset when closing.
  useEffect(() => {
    if (!isOpen) {
      form.reset(EMPTY_VALUES);
      return;
    }
    form.reset({
      name: doctor?.name ?? '',
      specialization: doctor?.specialization ?? '',
      email: doctor?.email ?? '',
      phone: doctor?.phone ?? '',
      experienceYears: doctor?.experienceYears?.toString() ?? '',
    });
  }, [isOpen, doctor, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    const payload = {
      name: values.name.trim(),
      specialization: values.specialization.trim(),
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      experienceYears: values.experienceYears
        ? Number(values.experienceYears)
        : undefined,
    };

    try {
      if (isEdit && doctor) {
        await apiPatch(`/api/doctors/${doctor.id}`, payload);
        toast.success('Doctor updated');
      } else {
        await apiPost('/api/doctors', payload);
        toast.success('Doctor added', {
          description: 'Set their working hours next so they can be booked.',
        });
      }
      onClose();
      onSaved?.();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [key, errs] of Object.entries(e.fields)) {
          form.setError(key as keyof DoctorFormValues, { message: errs[0] });
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit doctor' : 'Add new doctor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this doctor’s profile.'
              : 'Create a doctor, then set their weekly working hours so patients (and the AI receptionist) can book them.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="Dr. Sara Khan"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                placeholder="Cardiologist"
                aria-invalid={!!form.formState.errors.specialization}
                {...form.register('specialization')}
              />
              {form.formState.errors.specialization && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.specialization.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experienceYears">Experience (years, optional)</Label>
              <Input
                id="experienceYears"
                type="number"
                min={0}
                max={70}
                placeholder="12"
                aria-invalid={!!form.formState.errors.experienceYears}
                {...form.register('experienceYears')}
              />
              {form.formState.errors.experienceYears && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.experienceYears.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinic.com"
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
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                placeholder="555-0101"
                aria-invalid={!!form.formState.errors.phone}
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
              {isSubmitting
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add doctor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
