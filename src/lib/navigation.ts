import { User, UserRole, AccessModule, FacilityModule } from '@/types';
import { hasCapability, isAdmin, canViewBilling } from '@/lib/permissions';
import { getVisibleWidgets } from '@/lib/dashboardWidgets';
import { SESSION_STORAGE_KEY } from '@/lib/authConstants';
import { isSessionValid } from '@/lib/auth';

export interface AllowedNavItem {
  id: string;
  label: string;
}

export function hasExistingValidSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('cms_authenticated') === 'true') {
      return true;
    }
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (isSessionValid(session).valid) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function clearRememberedLastPage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = [
      'cms_last_page',
      'cms_last_tab',
      'cms_remembered_tab',
      'cms_remembered_page',
      'last_page',
      'lastPage',
      'last_tab',
      'lastTab',
    ];
    keys.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
}

export function hasDashboardAccess(
  role: UserRole,
  user: User | null | undefined,
  modules?: AccessModule[]
): boolean {
  if (role === 'patient' || role === 'platform_super_admin') {
    return false;
  }
  if (isAdmin(user, modules)) {
    return true;
  }
  return getVisibleWidgets(user, modules).length > 0;
}

export function getAllowedNavItems(
  role: UserRole,
  user: User | null | undefined,
  modules: AccessModule[] = [],
  enabledFacilities?: FacilityModule[]
): AllowedNavItem[] {
  if (role === 'patient') {
    return [
      { id: 'overview', label: 'Appointments' },
      { id: 'records', label: 'Records' },
      { id: 'prescriptions', label: 'Prescriptions' },
      { id: 'billing', label: 'Invoices' },
    ];
  }

  // Platform Super Admin: strictly multi-branch enterprise governance (all clinic child modules removed)
  if (role === 'platform_super_admin') {
    return [
      { id: 'super_dashboard', label: 'Executive Overview' },
      { id: 'super_clinics', label: 'Clinic Directory' },
      { id: 'super_admins', label: 'Admin Accounts' },
      { id: 'super_agreements', label: 'Licence Agreements' },
      { id: 'super_facilities', label: 'Facility Entitlements' },
      { id: 'super_onboarding', label: 'Branch Onboarding' },
      { id: 'super_reports', label: 'Administrative Reports' },
      { id: 'super_settings', label: 'Platform Settings' },
    ];
  }

  const items: AllowedNavItem[] = [];
  const isOpdEnabled = !enabledFacilities || enabledFacilities.includes('OPD');
  const isBillingEnabled = !enabledFacilities || enabledFacilities.includes('Billing');

  if (hasDashboardAccess(role, user, modules)) {
    items.push({ id: 'dashboard', label: 'Dashboard' });
  }

  // Clinic Staff module (All staff and administrators)
  items.push({ id: 'clinic_staff', label: 'Clinic Staff' });
  items.push({ id: 'patient', label: 'Patients' });

  const hasFrontDesk =
    hasCapability(user, 'patientRegistration', modules) ||
    hasCapability(user, 'patientCheckIn', modules);
  const hasAdminAccess = hasCapability(user, 'administrativeAccess', modules);

  if ((hasFrontDesk || hasAdminAccess || role === 'receptionist') && isOpdEnabled) {
    items.push({ id: 'appointments', label: 'Appointments' });
  }

  if (hasCapability(user, 'emrRecordsAccess', modules)) {
    items.push({ id: 'patient', label: 'Patient Records' });
  }

  if ((hasCapability(user, 'consultationWorkstation', modules) || role === 'doctor') && isOpdEnabled) {
    items.push({ id: 'doctor', label: 'Consultation Desk' });
  }

  if ((hasFrontDesk || role === 'receptionist') && isOpdEnabled) {
    items.push({ id: 'role_receptionist', label: 'Reception' });
  }

  items.push({ id: 'attendance', label: 'Attendance' });

  if (canViewBilling(user, modules) && isBillingEnabled) {
    items.push({ id: 'billing', label: 'Billing' });
  }

  if (hasAdminAccess) {
    items.push({ id: 'access_control', label: 'Administrative' });
  }

  return items;
}

export function isTabAllowed(
  tab: string | null | undefined,
  role: UserRole,
  user: User | null | undefined,
  modules: AccessModule[] = [],
  enabledFacilities?: FacilityModule[]
): boolean {
  if (!tab) return false;
  const cleanTab = tab.toLowerCase();

  if (cleanTab === 'profile') return true;

  if (role === 'patient') {
    return [
      'dashboard',
      'overview',
      'appointments',
      'records',
      'prescriptions',
      'billing',
      'invoices',
    ].includes(cleanTab);
  }

  // Platform super admin strictly accesses enterprise governance modules
  if (role === 'platform_super_admin') {
    return [
      'organizations',
      'super_dashboard',
      'super_clinics',
      'super_admins',
      'super_agreements',
      'super_facilities',
      'super_onboarding',
      'super_reports',
      'super_alerts',
      'super_settings',
    ].includes(cleanTab);
  }

  const isOpdEnabled = !enabledFacilities || enabledFacilities.includes('OPD');
  const isBillingEnabled = !enabledFacilities || enabledFacilities.includes('Billing');

  // Block tabs gated behind facility modules
  if (
    [
      'doctor',
      'role_doctor',
      'consulting_calendar',
      'receptionist',
      'role_receptionist',
      'calendar',
      'appointments',
      'appointment',
    ].includes(cleanTab) &&
    !isOpdEnabled
  ) {
    return false;
  }

  if (['billing', 'admin_billing'].includes(cleanTab) && !isBillingEnabled) {
    return false;
  }

  if (cleanTab === 'dashboard') {
    return hasDashboardAccess(role, user, modules);
  }

  if (cleanTab === 'doctor' || cleanTab === 'role_doctor') {
    return hasCapability(user, 'consultationWorkstation', modules);
  }

  if (cleanTab === 'consulting_calendar') {
    return hasCapability(user, 'consultingCalendar', modules);
  }

  if (
    cleanTab === 'role_receptionist' ||
    cleanTab === 'receptionist'
  ) {
    return (
      hasCapability(user, 'patientRegistration', modules) ||
      hasCapability(user, 'patientCheckIn', modules)
    );
  }

  if (cleanTab === 'calendar' || cleanTab === 'appointments' || cleanTab === 'appointment') {
    return (
      hasCapability(user, 'patientRegistration', modules) ||
      hasCapability(user, 'patientCheckIn', modules) ||
      hasCapability(user, 'administrativeAccess', modules)
    );
  }

  if (cleanTab === 'clinic_staff' || cleanTab === 'staff' || cleanTab === 'staff_directory') {
    return true;
  }

  if (cleanTab === 'patient' || cleanTab === 'role_patient' || cleanTab === 'patients') {
    return true;
  }

  if (cleanTab === 'billing' || cleanTab === 'admin_billing') {
    return canViewBilling(user, modules);
  }

  if (cleanTab === 'access_control') {
    return hasCapability(user, 'administrativeAccess', modules);
  }

  if (cleanTab === 'attendance') {
    return true;
  }

  return false;
}

export function getPageTitle(tab: string, role: UserRole): string {
  if (role === 'patient') {
    if (tab === 'dashboard' || tab === 'overview') return 'My Health Portal';
    if (tab === 'records') return 'Records';
    if (tab === 'prescriptions') return 'Prescriptions';
    if (tab === 'billing' || tab === 'invoices') return 'Invoices';
    if (tab === 'profile') return 'My Profile';
    return 'My Health Portal';
  }

  const titles: Record<string, string> = {
    appointments: 'Appointments',
    appointment: 'Appointments',
    dashboard: 'Dashboard',
    doctor: 'Consultation Desk',
    role_doctor: 'Consultation Desk',
    consulting_calendar: 'Consulting Calendar',
    receptionist: 'Reception',
    role_receptionist: 'Reception',
    calendar: 'Reception',
    patient: 'Patients',
    patients: 'Patients',
    role_patient: 'Patients',
    clinic_staff: 'Clinic Staff',
    staff: 'Clinic Staff',
    billing: 'Billing',
    admin_billing: 'Billing',
    access_control: 'Administrative',
    organizations: 'Enterprise Organizations',
    super_dashboard: 'Executive Overview',
    super_clinics: 'Clinic Directory',
    super_admins: 'Admin Accounts',
    super_agreements: 'Licence Agreements',
    super_facilities: 'Facility Entitlements',
    super_onboarding: 'Branch Onboarding',
    super_reports: 'Administrative Reports',
    super_alerts: 'Actionable Alerts',
    super_settings: 'Platform Settings',
    attendance: 'Attendance',
    profile: 'My Profile',
  };

  return titles[tab] || 'Dashboard';
}

