// Aiva — role-based access control.
//
// Single source of truth for what each staff role may do. Both server code
// (route handlers, page shells) and client code (sidebar nav, conditional UI)
// import from here, so the file MUST stay free of "server-only" imports.
// Role values are the StaffRole enum strings from Prisma ("Admin" | "Doctor" |
// "Receptionist"), kept as a plain union so this module stays client-safe.

export type RoleKey = 'Admin' | 'Doctor' | 'Receptionist';

export type Permission =
  | 'dashboard:view'
  | 'appointment:read'
  | 'appointment:write'
  | 'patient:read'
  | 'patient:write'
  | 'doctor:read'
  | 'doctor:write'
  | 'call:read'
  | 'analytics:read'
  | 'team:manage'
  | 'clinic:write'
  | 'ai:manage';

// Capability matrix:
//   Admin        — everything (team, clinic + AI settings, all data).
//   Receptionist — day-to-day scheduling + patients + call log read.
//   Doctor       — sees only their own appointments/patients; no writes.
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  Admin: [
    'dashboard:view',
    'appointment:read',
    'appointment:write',
    'patient:read',
    'patient:write',
    'doctor:read',
    'doctor:write',
    'call:read',
    'analytics:read',
    'team:manage',
    'clinic:write',
    'ai:manage',
  ],
  Receptionist: [
    'dashboard:view',
    'appointment:read',
    'appointment:write',
    'patient:read',
    'patient:write',
    'doctor:read',
    'call:read',
  ],
  Doctor: ['dashboard:view', 'appointment:read', 'patient:read', 'doctor:read'],
};

export function permissionsForRole(role: string): readonly Permission[] {
  return ROLE_PERMISSIONS[role as RoleKey] ?? ROLE_PERMISSIONS.Receptionist;
}

// True when `role` holds at least one of the requested permissions (or ALL of
// them via requireAll).
export function can(
  role: string,
  permission: Permission | Permission[],
  opts: { requireAll?: boolean } = {},
): boolean {
  const held = permissionsForRole(role);
  const wanted = Array.isArray(permission) ? permission : [permission];
  return opts.requireAll
    ? wanted.every((p) => held.includes(p))
    : wanted.some((p) => held.includes(p));
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  Admin: 'Admin',
  Doctor: 'Doctor',
  Receptionist: 'Receptionist',
};

// Display order for role selects / filters (matches the enum, not a permission
// order — keep in sync with the Prisma StaffRole enum).
export const ROLE_KEYS: RoleKey[] = ['Admin', 'Receptionist', 'Doctor'];

// Roles allowed to mutate appointments/patients/doctors respectively — the
// "write" side of the matrix. Read-only roles are excluded.
export const APPOINTMENT_WRITE_ROLES: readonly RoleKey[] = [
  'Admin',
  'Receptionist',
];
export const PATIENT_WRITE_ROLES: readonly RoleKey[] = [
  'Admin',
  'Receptionist',
];
export const DOCTOR_WRITE_ROLES: readonly RoleKey[] = ['Admin'];