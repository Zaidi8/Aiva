'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Mail, Phone, UserX, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
import { motion } from 'motion/react';
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

const ROLES: StaffRole[] = ['Admin', 'Receptionist', 'Doctor'];

function roleBadgeClass(role: StaffRole): string {
  switch (role) {
    case 'Admin':
      return 'bg-[#2F80ED]/10 text-[#2F80ED]';
    case 'Doctor':
      return 'bg-[#27AE60]/10 text-[#27AE60]';
    default:
      return 'bg-[#F2994A]/10 text-[#F2994A]';
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
      toast.error(e instanceof ApiError ? e.message : 'Failed to remove member.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F9FB]">
        <TopBar title="Team" description="Manage who can access this clinic" />
        <div className="p-8 max-w-3xl mx-auto">
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">Admins only</h3>
              <p className="text-gray-500">
                Only clinic admins can add or manage team members. Ask an admin
                if you need access changed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Team"
        description="Manage who can access this clinic"
        actionButton={
          <Button
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        }
      />

      <div className="p-8 max-w-5xl mx-auto space-y-4">
        {initialStaff.map((member, index) => {
          const isSelf = member.id === currentStaffId;
          return (
            <motion.div
              key={member.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-lg shadow-md flex-shrink-0">
                      {initials(member.fullName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg text-[#333333] font-medium">
                          {member.fullName}
                        </h3>
                        {isSelf && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs ${roleBadgeClass(member.role)}`}
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
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
                        <SelectTrigger className="h-9 w-36 text-sm">
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
                        size="sm"
                        className="text-red-600 hover:bg-red-600 hover:text-white transition-all"
                        onClick={() => handleRemove(member)}
                        disabled={isSelf}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AddTeamMemberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
