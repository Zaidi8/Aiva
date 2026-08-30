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
import { ROLE_KEYS } from '@/lib/rbac';
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

const ROLE_HINTS: Record<(typeof ROLE_KEYS)[number], string> = {
  Admin: 'Full access, manages the team',
  Receptionist: 'Day-to-day scheduling',
  Doctor: 'Clinical staff login',
};

// Role select options derived from lib/rbac.ts so the dropdown can't drift
// from the permission matrix.
const ROLES: { value: StaffRole; label: string; hint: string }[] = ROLE_KEYS.map(
  (key) => ({ value: key as StaffRole, label: key, hint: ROLE_HINTS[key] }),
);

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
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                Member added
              </DialogTitle>
              <DialogDescription>
                Share these login details with {credentials.email}. The
                temporary password won’t be shown again — they can change it
                after logging in.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="space-y-2 rounded-lg border border-border bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">
                    {credentials.email}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Temp password</span>
                  <span className="font-mono font-medium text-foreground">
                    {credentials.tempPassword}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy />
                    Copy login details
                  </>
                )}
              </Button>

              <Button className="w-full" onClick={handleDismissCredentials}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>
                Create a dashboard login. We’ll generate a temporary password
                for you to share.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
                  aria-invalid={!!form.formState.errors.fullName}
                  {...form.register('fullName')}
                />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@clinic.com"
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
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(val) =>
                    form.setValue('role', val as StaffRole)
                  }
                >
                  <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title (optional)</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Practice Manager"
                    {...form.register('jobTitle')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="555-0101"
                    {...form.register('phone')}
                  />
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
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create login'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
