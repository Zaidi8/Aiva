// Aiva — role-based data scoping for server components + route handlers.
//
// "Doctor" logins only see THEIR OWN clinical data (the Doctor row linked via
// Doctor.clinicStaffId). Every other role is clinic-wide. This helper is the
// single place that answers "what is this staff allowed to read?"

import "server-only";
import type { StaffRole } from "@prisma/client";

export type RoleScope =
  | { limited: false; doctorId?: never } // clinic-wide (Admin, Receptionist, unknown roles)
  | { limited: true; doctorId: string | null }; // Doctor: linked doctor id, or null if unlinked

// The staff shape only needs the fields doctorScope reads: role + the linked
// Doctor relation (Doctor.clinicStaffId is the FK back to ClinicStaff).
// getCurrentStaff() in lib/auth.ts includes `linkedDoctor` precisely so this
// helper can resolve a Doctor login to their own Doctor row.
export function doctorScope(staff: {
  role: StaffRole;
  linkedDoctor?: { id: string } | null;
}): RoleScope {
  if (staff.role !== "Doctor") return { limited: false };
  return { limited: true, doctorId: staff.linkedDoctor?.id ?? null };
}