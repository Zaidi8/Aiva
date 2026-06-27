// Aiva — ClinicStaff writes: own-profile edit + admin team management.
//
// Team members are real dashboard logins. Creating one provisions a Supabase
// auth user (via the service-role admin client) AND a ClinicStaff row in the
// caller's clinic. The temp password is returned ONCE for the admin to share —
// it is never stored or re-derivable.

import "server-only";
import { randomBytes } from "crypto";
import type { ClinicStaff, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clinicWhere } from "@/lib/clinic-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateStaffInput, UpdateMeInput } from "@/lib/validations/staff";

type ScopedStaff = Pick<ClinicStaff, "id" | "clinicId">;

// Outcome enum for guarded mutations so routes can map to 404/409 without
// throwing for expected business rules.
export type StaffMutationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "last_admin" | "self" };

function generateTempPassword(): string {
  // 18 url-safe chars + guaranteed symbol/case mix so it satisfies any policy.
  const raw = randomBytes(14).toString("base64url");
  return `Av-${raw}9`;
}

// Self-service: update the caller's OWN row only (keyed by their staff id).
export async function updateMe(
  staff: ScopedStaff,
  input: UpdateMeInput,
): Promise<ClinicStaff> {
  return prisma.clinicStaff.update({
    where: { id: staff.id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
    },
  });
}

export async function createStaffUser(
  staff: ScopedStaff,
  input: CreateStaffInput,
): Promise<{ staff: ClinicStaff; tempPassword: string }> {
  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  // 1. Provision the auth user (email pre-confirmed so they can log in now).
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) {
    throw new StaffProvisionError(
      error?.message ?? "Could not create the login for that email.",
    );
  }
  const authUserId = data.user.id;

  // 2. Create the ClinicStaff row. On failure, roll back the auth user so we
  //    don't leak an orphaned login the admin can't see or manage.
  try {
    const row = await prisma.clinicStaff.create({
      data: {
        authUserId,
        clinicId: staff.clinicId,
        fullName: input.fullName,
        email: input.email,
        role: input.role,
        jobTitle: input.jobTitle,
        phone: input.phone,
      },
    });
    return { staff: row, tempPassword };
  } catch (e) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {
      // best-effort; the row insert is the source of truth for "is a member".
    });
    throw e;
  }
}

export async function updateStaffRole(
  staff: ScopedStaff,
  targetId: string,
  role: StaffRole,
): Promise<StaffMutationResult> {
  if (targetId === staff.id) return { ok: false, reason: "self" };

  const target = await prisma.clinicStaff.findFirst({
    where: { id: targetId, ...clinicWhere(staff), deactivatedAt: null },
  });
  if (!target) return { ok: false, reason: "not_found" };

  // Don't allow demoting the last remaining Admin.
  if (target.role === "Admin" && role !== "Admin") {
    const admins = await prisma.clinicStaff.count({
      where: { ...clinicWhere(staff), role: "Admin", deactivatedAt: null },
    });
    if (admins <= 1) return { ok: false, reason: "last_admin" };
  }

  await prisma.clinicStaff.update({ where: { id: targetId }, data: { role } });
  return { ok: true };
}

export async function deactivateStaff(
  staff: ScopedStaff,
  targetId: string,
): Promise<StaffMutationResult> {
  if (targetId === staff.id) return { ok: false, reason: "self" };

  const target = await prisma.clinicStaff.findFirst({
    where: { id: targetId, ...clinicWhere(staff), deactivatedAt: null },
  });
  if (!target) return { ok: false, reason: "not_found" };

  if (target.role === "Admin") {
    const admins = await prisma.clinicStaff.count({
      where: { ...clinicWhere(staff), role: "Admin", deactivatedAt: null },
    });
    if (admins <= 1) return { ok: false, reason: "last_admin" };
  }

  await prisma.clinicStaff.update({
    where: { id: targetId },
    data: { deactivatedAt: new Date() },
  });
  return { ok: true };
}

// Thrown when Supabase auth-user provisioning fails (distinct from Prisma
// errors so the route can return a clean 409/400 instead of a 500).
export class StaffProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffProvisionError";
  }
}
