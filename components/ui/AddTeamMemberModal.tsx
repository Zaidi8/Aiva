'use client';

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Copy, Check, KeyRound } from 'lucide-react';
import { apiPost, ApiError } from '@/lib/client/fetcher';
import type { StaffRole } from '@prisma/client';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called when the credentials view is dismissed so the page refreshes.
  onCreated?: () => void;
}

interface TeamFormValues {
  fullName: string;
  email: string;
  role: StaffRole;
  jobTitle?: string;
  phone?: string;
}

const EMPTY: TeamFormValues = {
  fullName: '',
  email: '',
  role: 'Receptionist',
  jobTitle: '',
  phone: '',
};

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: 'Admin', label: 'Admin', hint: 'Full access, manages the team' },
  { value: 'Receptionist', label: 'Receptionist', hint: 'Day-to-day scheduling' },
  { value: 'Doctor', label: 'Doctor', hint: 'Clinical staff login' },
];

interface Credentials {
  email: string;
  tempPassword: string;
}

export function AddTeamMemberModal({
  isOpen,
  onClose,
  onCreated,
}: AddTeamMemberModalProps) {
  const form = useForm<TeamFormValues>({
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      form.reset(EMPTY);
      setCredentials(null);
      setCopied(false);
    }
  }, [isOpen, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      const result = await apiPost<{
        staff: { email: string };
        tempPassword: string;
      }>('/api/staff', {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        role: values.role,
        jobTitle: values.jobTitle?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      });
      setCredentials({
        email: result.staff.email,
        tempPassword: result.tempPassword,
      });
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [key, errs] of Object.entries(e.fields)) {
          form.setError(key as keyof TeamFormValues, { message: errs[0] });
        }
        toast.error('Please fix the highlighted fields.');
      } else if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  });

  const handleCopy = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nTemporary password: ${credentials.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the text manually.');
    }
  };

  const handleDismissCredentials = () => {
    onCreated?.();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        open ? null : credentials ? handleDismissCredentials() : onClose()
      }
    >
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2F80ED]" />
                Member added
              </DialogTitle>
              <DialogDescription className="text-sm">
                Share these login details with {credentials.email}. The
                temporary password won’t be shown again — they can change it
                after logging in.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-[#F7F9FB] p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-[#333333]">
                    {credentials.email}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Temp password</span>
                  <span className="font-mono font-medium text-[#333333]">
                    {credentials.tempPassword}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy login details
                  </>
                )}
              </Button>

              <Button
                className="w-full bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90"
                onClick={handleDismissCredentials}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Invite Team Member</DialogTitle>
              <DialogDescription className="text-sm">
                Create a dashboard login. We’ll generate a temporary password
                for you to share.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-3 mt-3" noValidate>
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
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

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@clinic.com"
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
                <Label htmlFor="role" className="text-xs">
                  Role
                </Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(val) =>
                    form.setValue('role', val as StaffRole)
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} — {r.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="jobTitle" className="text-xs">
                    Job Title (Optional)
                  </Label>
                  <Input
                    id="jobTitle"
                    placeholder="Practice Manager"
                    className="h-10 text-sm"
                    {...form.register('jobTitle')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">
                    Phone (Optional)
                  </Label>
                  <Input
                    id="phone"
                    placeholder="555-0101"
                    className="h-10 text-sm"
                    {...form.register('phone')}
                  />
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
                  {isSubmitting ? 'Creating…' : 'Create Login'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
