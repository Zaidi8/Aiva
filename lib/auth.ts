// Auth helpers for Server Components, Server Actions, and Route Handlers.
//
// Always use getUser() (verifies the JWT against Supabase) rather than
// getSession() in trusted server contexts.
//
// Server Components / Server Actions:  use getCurrentStaff / requireStaff / requireRole.
// Route Handlers (app/api/**/route.ts): use requireApiStaff / requireApiRole — they
//   return a Response on failure that the caller forwards directly.

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { Prisma, StaffRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export class NotAuthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

export type StaffWithClinic = Prisma.ClinicStaffGetPayload<{
  include: { clinic: true; linkedDoctor: true };
}>;

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Returns the logged-in staff (with clinic), or null if there is no session
// OR the staff row has been soft-deleted. Soft-deleted staff are treated as
// logged out — they should not be able to load any dashboard data.
// Doctor-role logins are tied to the Doctor row whose email matches their own
// within the SAME clinic. We auto-link on first fetch (when linkedDoctor is
// null) so a staff login created for an existing doctor row immediately sees
// their own appointments/patients without any manual step.
async function ensureDoctorLink(
  staff: Prisma.ClinicStaffGetPayload<{
    include: { clinic: true; linkedDoctor: true };
  }>
): Promise<StaffWithClinic | null> {
  // Only Doctor logins are scoped, and only need linking when not yet linked
  // or the link's already resolved. Skip everything else.
  if (
    staff.role !== "Doctor" ||
    staff.linkedDoctor !== null ||
    !staff.email
  ) {
    return staff as StaffWithClinic;
  }

  // Match against the doctor row in the same clinic with the same email. Only
  // claim rows not already linked to another staff login (clinicStaffId unique).
  const match = await prisma.doctor.findFirst({
    where: {
      clinicId: staff.clinicId,
      email: staff.email,
      deactivatedAt: null,
      clinicStaffId: null,
    },
    select: { id: true },
  });
  if (!match) return staff as StaffWithClinic;

  // The FK lives on Doctor.clinicStaffId (SetNull on staff delete). Set it so
  // the staff's `linkedDoctor` relation — and therefore doctorScope() — resolves.
  await prisma.doctor.update({
    where: { id: match.id },
    data: { clinicStaffId: staff.id },
  });

  const relinked = await prisma.clinicStaff.findFirst({
    where: { id: staff.id },
    include: { clinic: true, linkedDoctor: true },
  });
  return relinked as StaffWithClinic;
}

export async function getCurrentStaff(): Promise<StaffWithClinic | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const staff = await prisma.clinicStaff.findFirst({
    where: { authUserId: user.id, deactivatedAt: null },
    include: { clinic: true, linkedDoctor: true },
  });
  if (!staff) return null;

  return ensureDoctorLink(staff);
}

// Server Component / Server Action variant: redirect to /auth on missing session.
// Use this when you want to guarantee a non-null staff in the rest of the function.
export async function requireStaff(): Promise<StaffWithClinic> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/auth");
  return staff;
}

// Server Component / Server Action variant: requires staff AND that their role is
// in `allowedRoles`. Throws NotAuthorizedError on role mismatch — let the nearest
// error boundary catch it (or wrap the call in try/catch to render a 403 page).
export async function requireRole(
  allowedRoles: StaffRole[]
): Promise<StaffWithClinic> {
  const staff = await requireStaff();
  if (!allowedRoles.includes(staff.role)) {
    throw new NotAuthorizedError(
      `Role ${staff.role} is not permitted for this action.`
    );
  }
  return staff;
}

// Route Handler variant. Returns either the staff or a Response the caller
// should return as-is. Pattern:
//
//   const result = await requireApiStaff(req);
//   if (result instanceof Response) return result;
//   const staff = result;
//
// Doing it this way (instead of throwing) keeps API routes free of try/catch
// boilerplate around auth.
export async function requireApiStaff(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: NextRequest
): Promise<StaffWithClinic | Response> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return staff;
}

// Route Handler variant with role check. 401 if no session, 403 if wrong role.
export async function requireApiRole(
  request: NextRequest,
  allowedRoles: StaffRole[]
): Promise<StaffWithClinic | Response> {
  const result = await requireApiStaff(request);
  if (result instanceof Response) return result;
  if (!allowedRoles.includes(result.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
