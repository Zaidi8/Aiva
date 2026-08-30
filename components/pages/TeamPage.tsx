'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Mail, Phone, UserX, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SectionCard } from '../ui/section-card';
import { EmptyState } from '../ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TopBar } from '../ui/TopBar';
import { AddTeamMemberModal } from '../ui/AddTeamMemberModal';
import { apiPatch, apiDelete, ApiError } from '@/lib/client/fetcher';
import { ROLE_KEYS } from '@/lib/rbac';
import type { StaffRole } from '@prisma/client';

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  jobTitle: string | null;
  phone: string | null;
}

interface TeamPageProps {
  initialStaff: StaffMember[];
  currentStaffId: string;
  isAdmin: boolean;
}

const ROLES: StaffRole[] = ROLE_KEYS as StaffRole[];

// Map each role to a soft, tinted badge variant (the enterprise standard for
// categorical labels) rather than ad-hoc hex tints.
function roleBadgeVariant(
  role: StaffRole,
): 'brand' | 'success' | 'warning' {
  switch (role) {
    case 'Admin':
      return 'brand';
    case 'Doctor':
      return 'success';
    default:
      return 'warning';
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TeamPage({
  initialStaff,
  currentStaffId,
  isAdmin,
}: TeamPageProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const refresh = () => startTransition(() => router.refresh());

  const handleRoleChange = async (member: StaffMember, role: StaffRole) => {
    if (role === member.role) return;
    try {
      await apiPatch(`/api/staff/${member.id}`, { role });
      toast.success(`${member.fullName} is now ${role}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to update role.');
      refresh(); // revert the optimistic Select back to server truth
    }
  };

  const handleRemove = async (member: StaffMember) => {
    if (
      !window.confirm(
        `Remove ${member.fullName}? They’ll lose access immediately.`,
      )
    ) {
      return;
    }
    try {
      await apiDelete(`/api/staff/${member.id}`);
      toast.success(`${member.fullName} removed`);
      refresh();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Failed to remove member.',
      );
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <TopBar title="Team" description="Manage who can access this clinic" />
        <div className="mx-auto max-w-3xl p-6">
          <SectionCard>
            <EmptyState
              icon={<ShieldCheck />}
              title="Admins only"
              description="Only clinic admins can add or manage team members. Ask an admin if you need access changed."
            />
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Team"
        description="Manage who can access this clinic"
        actionButton={
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus />
            Invite member
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl p-6">
        <SectionCard noPadding>
          <ul className="divide-y divide-border">
            {initialStaff.map((member) => {
              const isSelf = member.id === currentStaffId;
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-5 p-6 transition-colors hover:bg-muted/60"
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-muted text-lg font-semibold text-primary">
                    {initials(member.fullName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {member.fullName}
                      </h3>
                      {isSelf && <Badge variant="outline">You</Badge>}
                      <Badge variant={roleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-4" />
                        {member.email}
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-4" />
                          {member.phone}
                        </span>
                      )}
                      {member.jobTitle && <span>· {member.jobTitle}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member, v as StaffRole)
                      }
                      disabled={isSelf}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemove(member)}
                      disabled={isSelf}
                      aria-label={`Remove ${member.fullName}`}
                    >
                      <UserX />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <AddTeamMemberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
