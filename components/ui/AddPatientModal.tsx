'use client';

import { toast } from 'sonner';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { apiPost, ApiError } from '@/lib/client/fetcher';
import type { CreatePatientInput } from '@/lib/validations/patient';

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
  // No resolver: the API zod schema lives on a different shape (typed
  // `medicalHistory: string[]`, numeric `age`) than the form (`medicalHistoryText: string`,
  // string `age`). We post the adapted payload and surface server-side 422
  // field errors via `form.setError` in the catch block.
  const form = useForm<AddPatientFormValues>({
    defaultValues: EMPTY_VALUES,
    mode: 'onSubmit',
  });

  // Reset whenever the modal closes so re-opening starts fresh.
  useEffect(() => {
    if (!isOpen) form.reset(EMPTY_VALUES);
  }, [isOpen, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
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
          <DialogTitle>Add new patient</DialogTitle>
          <DialogDescription>Create a new patient record</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              placeholder="John Smith"
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
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="35"
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
              <Label htmlFor="gender">Gender</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.gender.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">Phone number</Label>
            <Input
              id="phoneNumber"
              placeholder="555-0101"
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
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="patient@example.com"
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
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St"
              aria-invalid={!!form.formState.errors.address}
              {...form.register('address')}
            />
            {form.formState.errors.address && (
              <p className="text-xs text-destructive">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medical-history">Medical history (optional)</Label>
            <Input
              id="medical-history"
              placeholder="e.g., Hypertension, Diabetes"
              {...form.register('medicalHistoryText')}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple conditions with commas.
            </p>
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
              {isSubmitting ? 'Adding…' : 'Add patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
