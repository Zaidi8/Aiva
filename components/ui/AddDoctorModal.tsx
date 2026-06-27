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
}

const EMPTY_VALUES: DoctorFormValues = {
  name: '',
  specialization: '',
  email: '',
  phone: '',
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
          <DialogTitle className="text-xl">
            {isEdit ? 'Edit Doctor' : 'Add New Doctor'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEdit
              ? 'Update this doctor’s profile.'
              : 'Create a doctor, then set their weekly working hours so patients (and the AI receptionist) can book them.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3 mt-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="Dr. Sara Khan"
              className="h-10 text-sm"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="specialization" className="text-xs">
              Specialization
            </Label>
            <Input
              id="specialization"
              placeholder="General Physician"
              className="h-10 text-sm"
              aria-invalid={!!form.formState.errors.specialization}
              {...form.register('specialization')}
            />
            {form.formState.errors.specialization && (
              <p className="text-xs text-red-600">
                {form.formState.errors.specialization.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinic.com"
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
              <Label htmlFor="phone" className="text-xs">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                placeholder="555-0101"
                className="h-10 text-sm"
                aria-invalid={!!form.formState.errors.phone}
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              size="sm"
              className="flex-1 text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1 bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 text-xs"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Doctor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
