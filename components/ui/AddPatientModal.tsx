'use client';

import { toast } from 'sonner';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { apiPost, ApiError } from '@/lib/client/fetcher';
import {
  createPatientSchema,
  type CreatePatientInput,
} from '@/lib/validations/patient';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called after the API responds with a 201. The page wrapper uses this to
  // trigger router.refresh() so the server-rendered list re-fetches.
  onCreated?: () => void;
}

// Form-only shape: medicalHistory is collected as a comma-separated string in
// the UI and split before submit. Everything else matches the zod schema.
interface AddPatientFormValues {
  fullName: string;
  phoneNumber: string;
  age?: string; // input type=number still produces strings
  gender?: 'Male' | 'Female' | 'Other' | '';
  email?: string;
  address?: string;
  medicalHistoryText?: string;
}

const EMPTY_VALUES: AddPatientFormValues = {
  fullName: '',
  phoneNumber: '',
  age: '',
  gender: '',
  email: '',
  address: '',
  medicalHistoryText: '',
};

export function AddPatientModal({ isOpen, onClose, onCreated }: AddPatientModalProps) {
  const form = useForm<AddPatientFormValues>({
    // The zod schema lives on the API; we adapt the form payload before submit
    // so we still validate against the exact same schema (no drift).
    resolver: zodResolver(
      createPatientSchema.transform((v) => v) as unknown as never,
    ),
    defaultValues: EMPTY_VALUES,
    // Validation runs onBlur for snappier UX; submit always re-validates.
    mode: 'onBlur',
  });

  // Reset whenever the modal closes so re-opening starts fresh.
  useEffect(() => {
    if (!isOpen) form.reset(EMPTY_VALUES);
  }, [isOpen, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    // Translate the form's loose shape into a strict CreatePatientInput.
    const payload: CreatePatientInput = {
      fullName: values.fullName.trim(),
      phoneNumber: values.phoneNumber.trim(),
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
      await apiPost('/api/patients', payload);
      toast.success('Patient added', {
        description: 'New patient record created.',
      });
      onClose();
      onCreated?.();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        // Field-level errors land on the matching inputs. The fetcher already
        // unwraps the { error: { fields } } envelope.
        for (const [key, errs] of Object.entries(e.fields)) {
          // medicalHistory in the API maps to medicalHistoryText in the form.
          const formKey =
            key === 'medicalHistory' ? 'medicalHistoryText' : key;
          form.setError(formKey as keyof AddPatientFormValues, {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Patient</DialogTitle>
          <DialogDescription className="text-sm">
            Create a new patient record
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3 mt-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="fullName" className="text-xs">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Smith"
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
              <Label htmlFor="age" className="text-xs">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="35"
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
              <Label htmlFor="gender" className="text-xs">Gender</Label>
              <Select
                value={form.watch('gender') ?? ''}
                onValueChange={(val) =>
                  form.setValue(
                    'gender',
                    (val || '') as AddPatientFormValues['gender'],
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
              {form.formState.errors.gender && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.gender.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phoneNumber" className="text-xs">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="555-0101"
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
            <Label htmlFor="email" className="text-xs">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="patient@example.com"
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
            <Label htmlFor="address" className="text-xs">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St"
              className="h-10 text-sm"
              aria-invalid={!!form.formState.errors.address}
              {...form.register('address')}
            />
            {form.formState.errors.address && (
              <p className="text-xs text-red-600">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="medical-history" className="text-xs">
              Medical History (Optional)
            </Label>
            <Input
              id="medical-history"
              placeholder="e.g., Hypertension, Diabetes"
              className="h-10 text-sm"
              {...form.register('medicalHistoryText')}
            />
            <p className="text-[10px] text-gray-500">
              Separate multiple conditions with commas.
            </p>
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
              {isSubmitting ? 'Adding...' : 'Add Patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
