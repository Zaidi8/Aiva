// Multi-tenant isolation layer.
//
// THE THREAT: any logged-in user from Clinic A could construct a URL or POST
// body with a record ID belonging to Clinic B. Without scoping, Prisma would
// happily return that row. Same applies to bulk list endpoints — without a
// clinicId filter, /api/patients would dump every patient in the database.
//
// THE RULE: every Prisma query against a clinic-owned model — Patient, Doctor,
// Appointment, CallLog, Notification, StaffInvitation, DoctorSchedule,
// DoctorTimeOff (via doctor.clinicId) — MUST spread clinicWhere(staff) into
// its `where` clause. No exceptions.
//
// FOR SINGLE-RECORD LOOKUPS BY ID, USE findFirst, NOT findUnique:
//   ❌ prisma.appointment.findUnique({ where: { id } })
//   ✅ prisma.appointment.findFirst({ where: { id, ...clinicWhere(staff) } })
//
// findUnique ignores extra where conditions on non-unique fields and would
// leak data across clinics; findFirst respects them and returns null on miss.
//
// We deliberately do NOT enforce this with TypeScript magic or a Prisma
// extension yet — convention + code review is enough at our current size.
// If we start finding scoping bugs in review, escalate to a Prisma client
// extension that injects the filter automatically.

import type { ClinicStaff } from "@prisma/client";

// Returns a Prisma `where` fragment that scopes a query to the staff's clinic.
// Spread it into your where: { ..., ...clinicWhere(staff) }.
export function clinicWhere(staff: Pick<ClinicStaff, "clinicId">) {
  return { clinicId: staff.clinicId };
}

// TODO(future API routes): every route under app/api/** that touches clinic-owned
// data must call requireApiStaff / requireApiRole and use clinicWhere(staff) in
// every prisma query. /api/appointments did not exist at the time this helper
// was introduced — when it lands, audit it against the rule above.
