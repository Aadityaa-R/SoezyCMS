import { UserRole } from '../types';

export type Permission =
  // Platform & Clinic Management
  | 'clinics:manage_all'
  | 'clinics:switch'
  | 'clinics:create'
  | 'clinics:edit_profile'
  // Administrative Hierarchy
  | 'admins:manage_super'
  | 'admins:manage_clinic'
  // Staff & HR
  | 'staff:view'
  | 'staff:manage'
  | 'staff:roster'
  | 'staff:approve_leave'
  // Patients
  | 'patients:register'
  | 'patients:view'
  | 'patients:medical'
  // Clinical Operations
  | 'clinical:consult'
  | 'clinical:prescribe'
  | 'clinical:vitals'
  // Front Desk & Queue
  | 'queue:view'
  | 'queue:checkin'
  | 'queue:manage'
  | 'appointments:book'
  | 'appointments:cancel'
  // Billing & Finance
  | 'billing:view'
  | 'billing:invoice'
  | 'billing:collect'
  | 'billing:discount'
  // Compliance & Audit
  | 'audit:view';

/**
 * Standard permissions matrix per role.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  platform_super_admin: [
    'clinics:manage_all',
    'clinics:switch',
    'clinics:create',
    'clinics:edit_profile',
    'admins:manage_super',
    'admins:manage_clinic',
    'staff:view',
    'staff:manage',
    'staff:roster',
    'staff:approve_leave',
    'patients:view',
    'queue:view',
    'billing:view',
    'audit:view',
  ],

  clinic_super_admin: [
    'clinics:edit_profile',
    'admins:manage_clinic',
    'staff:view',
    'staff:manage',
    'staff:roster',
    'staff:approve_leave',
    'patients:register',
    'patients:view',
    'queue:view',
    'queue:checkin',
    'queue:manage',
    'appointments:book',
    'appointments:cancel',
    'billing:view',
    'billing:invoice',
    'billing:collect',
    'billing:discount',
    'audit:view',
  ],

  admin: [
    'staff:view',
    'staff:manage',
    'staff:roster',
    'staff:approve_leave',
    'patients:register',
    'patients:view',
    'queue:view',
    'queue:checkin',
    'queue:manage',
    'appointments:book',
    'appointments:cancel',
    'billing:view',
    'billing:invoice',
    'billing:collect',
    'billing:discount',
    'audit:view',
  ],

  md: [
    'staff:view',
    'staff:roster',
    'patients:view',
    'patients:medical',
    'clinical:consult',
    'clinical:prescribe',
    'clinical:vitals',
    'queue:view',
    'queue:manage',
    'appointments:book',
    'appointments:cancel',
    'billing:view',
  ],

  doctor: [
    'patients:view',
    'patients:medical',
    'clinical:consult',
    'clinical:prescribe',
    'clinical:vitals',
    'queue:view',
    'queue:manage',
    'appointments:book',
  ],

  receptionist: [
    'patients:register',
    'patients:view',
    'queue:view',
    'queue:checkin',
    'appointments:book',
    'appointments:cancel',
    'billing:view',
    'billing:invoice',
    'billing:collect',
  ],

  patient: [
    'queue:view',
    'appointments:book',
  ],
};

/**
 * Checks if a role has the specified permission.
 * Platform Super Admin bypasses all checks.
 * Optional customCapabilities array allows fine-grained overrides on individual staff.
 */
export function hasPermission(
  role: UserRole | undefined,
  permission: Permission,
  customCapabilities: string[] = []
): boolean {
  if (!role) return false;
  if (role === 'platform_super_admin') return true;

  // Check role-level permissions
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  if (rolePerms.includes(permission)) return true;

  // Check custom individual capabilities
  if (customCapabilities.includes(permission)) return true;

  return false;
}

/**
 * Checks whether a user can access a specific clinic.
 * Platform Super Admin has access to all clinics.
 */
export function canAccessClinic(
  userRole: UserRole | undefined,
  userClinicId: string | null | undefined,
  targetClinicId: string
): boolean {
  if (!userRole) return false;
  if (userRole === 'platform_super_admin') return true;
  return userClinicId === targetClinicId;
}

/**
 * Hierarchical authority level (lower number = higher authority).
 */
export const ROLE_HIERARCHY_LEVEL: Record<UserRole, number> = {
  platform_super_admin: 1,
  clinic_super_admin: 2,
  admin: 3,
  md: 4,
  doctor: 5,
  receptionist: 6,
  patient: 7,
};

/**
 * Determines if an actor can create, modify, or revoke an account with targetRole.
 * Users can only manage roles strictly lower in the hierarchy.
 */
export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  const actorLevel = ROLE_HIERARCHY_LEVEL[actorRole] || 99;
  const targetLevel = ROLE_HIERARCHY_LEVEL[targetRole] || 99;
  return actorLevel < targetLevel;
}

export function isPlatformSuperAdmin(role?: UserRole): boolean {
  return role === 'platform_super_admin';
}

export function isClinicSuperAdmin(role?: UserRole): boolean {
  return role === 'clinic_super_admin';
}

export function isClinicAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

/**
 * UI label and color scheme for each role badge.
 */
export function getRoleBadgeInfo(role: UserRole): { label: string; bg: string; text: string } {
  switch (role) {
    case 'platform_super_admin':
      return { label: 'Platform Super Admin', bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'clinic_super_admin':
      return { label: 'Clinic Super Admin', bg: 'bg-indigo-100', text: 'text-indigo-800' };
    case 'admin':
      return { label: 'Clinic Admin', bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'md':
      return { label: 'Lead Physician (MD)', bg: 'bg-emerald-100', text: 'text-emerald-800' };
    case 'doctor':
      return { label: 'Doctor', bg: 'bg-teal-100', text: 'text-teal-800' };
    case 'receptionist':
      return { label: 'Receptionist', bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'patient':
      return { label: 'Patient', bg: 'bg-slate-100', text: 'text-slate-800' };
    default:
      return { label: String(role), bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

