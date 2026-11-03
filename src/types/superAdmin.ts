export type BranchType =
  | 'main_hospital'
  | 'speciality_center'
  | 'outpatient_clinic'
  | 'satellite_branch';

export type ClinicOperationalStatus =
  | 'draft'
  | 'pending_onboarding'
  | 'pending_activation'
  | 'active'
  | 'inactive'
  | 'suspended';

export type OnboardingProgressStatus =
  | 'pending'
  | 'in_progress'
  | 'ready_for_review'
  | 'completed'
  | 'on_hold';

export interface ClinicRegistrationParams {
  name: string;
  code: string;
  branchType: BranchType;
  phone: string;
  email: string;
  primaryContactName: string;
  primaryContactDesignation: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  registrationNumber?: string;
  supportingDocument?: string;
}

export interface ClinicAdministrativeProfile {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  branchType: BranchType;
  phone: string;
  email: string;
  primaryContactName: string;
  primaryContactDesignation: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  registrationNumber: string;
  supportingDocument?: string;

  // Appointed Admin
  appointedAdminId?: string;
  appointedAdminName?: string;
  appointedAdminEmail?: string;
  appointedAdminPhone?: string;
  appointedAdminDesignation?: string;
  adminAssignmentDate?: string;

  // Agreement Summary
  agreementReference?: string;
  agreementStatus?: AgreementStatus;
  agreementStartDate?: string;
  agreementEndDate?: string;

  // Facility Entitlements
  optedFacilities: string[];
  entitledFacilities: string[];
  enabledModules: string[];

  // Onboarding & Status
  onboardingStatus: OnboardingProgressStatus;
  status: ClinicOperationalStatus;
  statusReason?: string;
  activationDate?: string;

  createdAt: string;
  updatedAt: string;
}

export type AdminAccountStatus =
  | 'active'
  | 'pending_invitation'
  | 'reassigned'
  | 'deactivated';

export interface AdminAssignmentRecord {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicCode: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  designation: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: AdminAccountStatus;
  notes?: string;
  createdAt: string;
}

export type AgreementType =
  | 'standard_saas'
  | 'enterprise_network'
  | 'custom_sla'
  | 'pilot_trial';

export type AgreementStatus =
  | 'draft'
  | 'pending_signature'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'renewed'
  | 'terminated';

export interface LicenceAgreementRecord {
  id: string;
  clinicId: string;
  clinicName: string;
  agreementReference: string;
  agreementType: AgreementType;
  startDate: string;
  endDate: string;
  signedDate?: string;
  status: AgreementStatus;
  secureDocumentName?: string;
  secureDocumentSize?: string;
  previousAgreementId?: string;
  coveredFacilities: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityCatalogueRecord {
  id: string;
  code: string;
  name: string;
  shortCode: string;
  description: string;
  relatedModuleKey: string;
  status: 'active' | 'inactive';
  dependencies?: string[];
}

export interface ClinicFacilityEntitlementRecord {
  id: string;
  clinicId: string;
  facilityCode: string;
  facilityName: string;
  optedStatus: boolean;            // 1. Opted for (Requested by clinic)
  entitlementStatus: boolean;      // 2. Contractually Entitled (Approved in agreement)
  moduleEnabledStatus: boolean;    // 3. Enabled in CMS (Module accessible)
  operationallyConfigured: boolean;// 4. Operationally Configured by Clinic Admin
  effectiveFrom: string;
  agreementReference?: string;
  notes?: string;
  updatedAt: string;
}

export type OnboardingChecklistItemKey =
  | 'registration'
  | 'contact_details'
  | 'admin_appointed'
  | 'admin_invitation'
  | 'agreement_uploaded'
  | 'agreement_verified'
  | 'facilities_selected'
  | 'entitlements_approved'
  | 'modules_enabled'
  | 'activation_review';

export interface OnboardingChecklistItemRecord {
  id: string;
  clinicId: string;
  itemKey: OnboardingChecklistItemKey;
  title: string;
  isMandatory: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
  isOverridden?: boolean;
  overrideReason?: string;
}

export type SuperAdminAuditAction =
  | 'clinic_created'
  | 'clinic_updated'
  | 'clinic_status_changed'
  | 'admin_appointed'
  | 'admin_reassigned'
  | 'admin_deactivated'
  | 'agreement_created'
  | 'agreement_renewed'
  | 'agreement_terminated'
  | 'facility_entitlement_changed'
  | 'onboarding_override'
  | 'branch_activated'
  | 'branch_suspended'
  | 'announcement_published'
  | 'settings_updated';

export interface SuperAdminAuditRecord {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: 'platform_super_admin';
  action: SuperAdminAuditAction;
  targetType: 'clinic' | 'admin' | 'agreement' | 'facility' | 'onboarding' | 'platform';
  targetId: string;
  targetName: string;
  reason?: string;
  beforeValue?: string;
  afterValue?: string;
  timestamp: string;
}

export interface SuperAdminAlertRecord {
  id: string;
  type: 'agreement_expiry' | 'admin_missing' | 'onboarding_pending' | 'facility_mismatch';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  targetTab:
    | 'super_dashboard'
    | 'super_clinics'
    | 'super_admins'
    | 'super_agreements'
    | 'super_facilities'
    | 'super_onboarding';
  targetId?: string;
  createdAt: string;
  acknowledged?: boolean;
}

export interface OrganizationAnnouncementRecord {
  id: string;
  title: string;
  content: string;
  audience: 'all_clinics' | 'clinic_admins_only' | 'selected_branches';
  priority: 'normal' | 'urgent';
  scheduledDate: string;
  createdBy: string;
  createdAt: string;
}

export interface PlatformOrganizationSettings {
  organizationName: string;
  organizationCode: string;
  headquartersAddress: string;
  city: string;
  state: string;
  country: string;
  officialPhone: string;
  officialEmail: string;
  website: string;
  reminderNoticeDays: number[]; // e.g. [60, 30, 7]
  autoSuspendOnAgreementExpiry: boolean;
  requireAdminBeforeActivation: boolean;
  requireSignedAgreementBeforeActivation: boolean;
}

