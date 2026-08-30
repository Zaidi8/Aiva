// Tenant-scoped read helpers for the Patient model.
//
// Every helper takes `staff` as its first argument and spreads
// clinicWhere(staff) into the Prisma `where` clause. We use findFirst (not
// findUnique) for single-row reads so the clinicId filter is actually applied
// — findUnique ignores non-unique extra conditions and would leak rows across
// clinics. See lib/clinic-scope.ts for the full rationale.

import "server-only";

import type { ClinicStaff } from "@prisma/client";

import { clinicWhere } from "@/lib/clinic-scope";
import { prisma } from "@/lib/prisma";

// Minimum staff shape every helper needs. StaffWithClinic from lib/auth.ts
// satisfies this shape, as does any other Pick that carries clinicId.
type ScopedStaff = Pick<ClinicStaff, "clinicId">;

export interface ListPatientsOptions {
  // Free-text query matched against fullName (case-insensitive contains) OR
  // phoneNumber (contains). Empty/undefined means "no filter".
  q?: string;
  // Pagination — defaults: take 50, skip 0.
  take?: number;
  skip?: number;
  // Restrict to patients who have at least one appointment with this doctor
  // (used for Doctor-role data scoping — see lib/role-scope.ts).
  doctorId?: string;
}

// Returns a page of patients in the caller's clinic plus the total count for
// that filter (so the UI can render pagination). `items` and `total` are
// fetched in parallel with Promise.all to keep the round-trip cheap.
export async function listPatients(
  staff: ScopedStaff,
  opts: ListPatientsOptions = {},
) {
  const { q, take = 50, skip = 0, doctorId } = opts;

  const trimmed = q?.trim();
  const where = {
    ...clinicWhere(staff),
    ...(doctorId
      ? { appointments: { some: { doctorId, clinicId: staff.clinicId } } }
      : {}),
    ...(trimmed
      ? {
          OR: [
            { fullName: { contains: trimmed, mode: "insensitive" as const } },
            { phoneNumber: { contains: trimmed } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.patient.count({ where }),
  ]);

  return { items, total };
}

// Single-row lookup scoped to the caller's clinic. Returns null if the
// patient doesn't exist OR belongs to a different clinic — callers cannot
// distinguish the two cases, which is the correct behavior (don't leak the
// existence of cross-tenant rows via 404 vs 403). Pass `doctorId` to further
// restrict to a patient that doctor has seen (Doctor-role scoping).
export async function getPatient(
  staff: ScopedStaff,
  id: string,
  doctorId?: string,
) {
  return prisma.patient.findFirst({
    where: {
      id,
      ...clinicWhere(staff),
      ...(doctorId
        ? { appointments: { some: { doctorId, clinicId: staff.clinicId } } }
        : {}),
    },
  });
}
