import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ClinicAdministrativeProfile,
  AdminAssignmentRecord,
  LicenceAgreementRecord,
  FacilityCatalogueRecord,
  OnboardingChecklistItemRecord,
  SuperAdminAuditRecord,
  SuperAdminAlertRecord,
  OrganizationAnnouncementRecord,
  PlatformOrganizationSettings,
  ClinicRegistrationParams,
  ClinicOperationalStatus,
  OnboardingChecklistItemKey,
  AgreementType,
  AdminAccountStatus,
} from '@/types/superAdmin';
import {
  loadSuperAdminState,
  saveSuperAdminState,
  SuperAdminState,
} from '@/data/superAdminData';

interface SuperAdminContextType {
  clinics: ClinicAdministrativeProfile[];
  admins: AdminAssignmentRecord[];
  agreements: LicenceAgreementRecord[];
  facilities: FacilityCatalogueRecord[];
  onboarding: OnboardingChecklistItemRecord[];
  auditLogs: SuperAdminAuditRecord[];
  alerts: SuperAdminAlertRecord[];
  announcements: OrganizationAnnouncementRecord[];
  settings: PlatformOrganizationSettings;

  selectedClinicId: string | null;
  setSelectedClinicId: (id: string | null) => void;

  // Workflows
  registerClinic: (params: ClinicRegistrationParams) => Promise<ClinicAdministrativeProfile>;
  updateClinic: (clinicId: string, updates: Partial<ClinicAdministrativeProfile>) => Promise<void>;
  changeClinicStatus: (clinicId: string, newStatus: ClinicOperationalStatus, reason: string) => Promise<{ success: boolean; error?: string }>;
  appointAdmin: (params: {
    clinicId: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    designation: string;
    effectiveDate: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  reassignAdmin: (params: {
    clinicId: string;
    newAdminName: string;
    newAdminEmail: string;
    newAdminPhone?: string;
    newDesignation: string;
    effectiveDate: string;
    reason: string;
  }) => Promise<{ success: boolean; error?: string }>;
  toggleAdminStatus: (assignmentId: string, newStatus: AdminAccountStatus, reason: string) => Promise<void>;
  addAgreement: (params: {
    clinicId: string;
    agreementReference: string;
    agreementType: AgreementType;
    startDate: string;
    endDate: string;
    signedDate?: string;
    secureDocumentName?: string;
    secureDocumentSize?: string;
    coveredFacilities: string[];
    remarks?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  renewAgreement: (params: {
    previousAgreementId: string;
    newReference: string;
    agreementType: AgreementType;
    startDate: string;
    endDate: string;
    secureDocumentName?: string;
    secureDocumentSize?: string;
    coveredFacilities: string[];
    remarks?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  terminateAgreement: (agreementId: string, reason: string) => Promise<void>;
  addFacilityToCatalogue: (facility: Omit<FacilityCatalogueRecord, 'id'>) => Promise<void>;
  updateFacilityCatalogue: (facilityId: string, updates: Partial<FacilityCatalogueRecord>) => Promise<void>;
  updateClinicFacilityEntitlement: (
    clinicId: string,
    facilityCode: string,
    stateUpdate: { optedStatus?: boolean; entitlementStatus?: boolean; moduleEnabledStatus?: boolean },
    reason: string
  ) => Promise<void>;
  updateOnboardingChecklist: (
    clinicId: string,
    itemKey: OnboardingChecklistItemKey,
    completed: boolean,
    remarks?: string
  ) => Promise<void>;
  overrideOnboardingItem: (
    clinicId: string,
    itemKey: OnboardingChecklistItemKey,
    reason: string
  ) => Promise<void>;
  activateClinicBranch: (clinicId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  suspendClinicBranch: (clinicId: string, reason: string) => Promise<void>;
  dismissAlert: (alertId: string) => void;
  createAnnouncement: (title: string, content: string, audience: any, priority: any) => Promise<void>;
  updateSettings: (updates: Partial<PlatformOrganizationSettings>) => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SuperAdminState>(loadSuperAdminState);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  // Auto-save on state change
  useEffect(() => {
    saveSuperAdminState(state);
  }, [state]);

  const addAuditEntry = (entry: Omit<SuperAdminAuditRecord, 'id' | 'actorUserId' | 'actorName' | 'actorRole' | 'timestamp'>) => {
    const newEntry: SuperAdminAuditRecord = {
      ...entry,
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(-3)}`,
      actorUserId: 'acc-platform-superadmin',
      actorName: 'Platform Super Admin',
      actorRole: 'platform_super_admin',
      timestamp: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      auditLogs: [newEntry, ...prev.auditLogs],
    }));
  };

  const registerClinic = async (params: ClinicRegistrationParams): Promise<ClinicAdministrativeProfile> => {
    const nextNumber = state.clinics.length + 1;
    const newId = `CLN-${String(nextNumber).padStart(3, '0')}`;
    const code = (params.code || `CLN${nextNumber}`).toUpperCase().replace(/[^A-Z0-9-]/g, '');

    const newClinic: ClinicAdministrativeProfile = {
      id: newId,
      organizationId: 'ORG-001',
      name: params.name.trim(),
      code,
      branchType: params.branchType,
      phone: params.phone.trim(),
      email: params.email.trim(),
      primaryContactName: params.primaryContactName.trim(),
      primaryContactDesignation: params.primaryContactDesignation.trim(),
      address: params.address.trim(),
      city: params.city.trim(),
      state: params.state.trim(),
      postalCode: params.postalCode.trim(),
      country: 'India',
      registrationNumber: params.registrationNumber?.trim() || `MED-REG-${code}-${Date.now().toString().slice(-4)}`,
      supportingDocument: params.supportingDocument,
      optedFacilities: ['OPD', 'Billing'],
      entitledFacilities: [],
      enabledModules: [],
      onboardingStatus: 'pending',
      status: 'pending_onboarding',
      statusReason: 'Initial clinic registration completed. Awaiting admin appointment and licence agreement upload.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create 10-point checklist for this clinic
    const defaultChecklist: OnboardingChecklistItemRecord[] = [
      { id: `ob-${newId}-1`, clinicId: newId, itemKey: 'registration', title: 'Clinic registration details completed', isMandatory: true, completed: true, completedAt: new Date().toISOString().slice(0, 10) },
      { id: `ob-${newId}-2`, clinicId: newId, itemKey: 'contact_details', title: 'Official contact and campus details verified', isMandatory: true, completed: true, completedAt: new Date().toISOString().slice(0, 10) },
      { id: `ob-${newId}-3`, clinicId: newId, itemKey: 'admin_appointed', title: 'Clinic Administrator officially appointed', isMandatory: true, completed: false },
      { id: `ob-${newId}-4`, clinicId: newId, itemKey: 'admin_invitation', title: 'Administrator credential invitation accepted', isMandatory: true, completed: false },
      { id: `ob-${newId}-5`, clinicId: newId, itemKey: 'agreement_uploaded', title: 'Signed licence agreement uploaded', isMandatory: true, completed: false },
      { id: `ob-${newId}-6`, clinicId: newId, itemKey: 'agreement_verified', title: 'Legal validity and SLA terms verified', isMandatory: true, completed: false },
      { id: `ob-${newId}-7`, clinicId: newId, itemKey: 'facilities_selected', title: 'Clinic opted facility wings recorded', isMandatory: true, completed: true, completedAt: new Date().toISOString().slice(0, 10) },
      { id: `ob-${newId}-8`, clinicId: newId, itemKey: 'entitlements_approved', title: 'Facility entitlements approved against agreement', isMandatory: true, completed: false },
      { id: `ob-${newId}-9`, clinicId: newId, itemKey: 'modules_enabled', title: 'Corresponding CMS clinical modules enabled', isMandatory: true, completed: false },
      { id: `ob-${newId}-10`, clinicId: newId, itemKey: 'activation_review', title: 'Final executive activation review completed', isMandatory: true, completed: false },
    ];

    setState((prev) => ({
      ...prev,
      clinics: [newClinic, ...prev.clinics],
      onboarding: [...prev.onboarding, ...defaultChecklist],
    }));

    addAuditEntry({
      action: 'clinic_created',
      targetType: 'clinic',
      targetId: newId,
      targetName: newClinic.name,
      reason: `Registered new branch ${newClinic.name} (${code}) in pending onboarding state.`,
      afterValue: 'pending_onboarding',
    });

    return newClinic;
  };

  const updateClinic = async (clinicId: string, updates: Partial<ClinicAdministrativeProfile>): Promise<void> => {
    setState((prev) => ({
      ...prev,
      clinics: prev.clinics.map((c) =>
        c.id === clinicId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }));

    addAuditEntry({
      action: 'clinic_updated',
      targetType: 'clinic',
      targetId: clinicId,
      targetName: updates.name || clinicId,
      reason: 'Updated clinic official details and administrative record.',
    });
  };

  const changeClinicStatus = async (
    clinicId: string,
    newStatus: ClinicOperationalStatus,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = state.clinics.find((c) => c.id === clinicId);
    if (!target) return { success: false, error: 'Clinic not found.' };

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A valid operational reason (minimum 5 characters) is required for status changes.' };
    }

    if (newStatus === 'active') {
      const pendingItems = state.onboarding.filter((o) => o.clinicId === clinicId && o.isMandatory && !o.completed && !o.isOverridden);
      if (pendingItems.length > 0) {
        return {
          success: false,
          error: `Cannot activate branch: ${pendingItems.length} mandatory onboarding requirements are incomplete. Complete all checklist items or record an authorised override.`,
        };
      }
    }

    const beforeStatus = target.status;
    setState((prev) => ({
      ...prev,
      clinics: prev.clinics.map((c) =>
        c.id === clinicId
          ? {
              ...c,
              status: newStatus,
              statusReason: reason.trim(),
              activationDate: newStatus === 'active' ? (c.activationDate || new Date().toISOString().slice(0, 10)) : c.activationDate,
              onboardingStatus: newStatus === 'active' ? 'completed' : c.onboardingStatus,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    }));

    addAuditEntry({
      action: 'clinic_status_changed',
      targetType: 'clinic',
      targetId: clinicId,
      targetName: target.name,
      beforeValue: beforeStatus,
      afterValue: newStatus,
      reason: reason.trim(),
    });

    return { success: true };
  };

  const appointAdmin = async (params: {
    clinicId: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    designation: string;
    effectiveDate: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const clinic = state.clinics.find((c) => c.id === params.clinicId);
    if (!clinic) return { success: false, error: 'Selected clinic was not found.' };

    const newAdminId = `acc-adm-${clinic.code.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
    const newAssignmentId = `asg-${Date.now().toString(36)}`;

    const newAssignment: AdminAssignmentRecord = {
      id: newAssignmentId,
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicCode: clinic.code,
      adminUserId: newAdminId,
      adminName: params.adminName.trim(),
      adminEmail: params.adminEmail.trim().toLowerCase(),
      adminPhone: params.adminPhone?.trim() || undefined,
      designation: params.designation.trim(),
      effectiveFrom: params.effectiveDate || new Date().toISOString().slice(0, 10),
      status: 'active',
      notes: params.notes?.trim() || 'Appointed by Platform Super Admin.',
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      admins: [newAssignment, ...prev.admins],
      clinics: prev.clinics.map((c) =>
        c.id === params.clinicId
          ? {
              ...c,
              appointedAdminId: newAdminId,
              appointedAdminName: params.adminName.trim(),
              appointedAdminEmail: params.adminEmail.trim().toLowerCase(),
              appointedAdminPhone: params.adminPhone?.trim() || undefined,
              appointedAdminDesignation: params.designation.trim(),
              adminAssignmentDate: params.effectiveDate || new Date().toISOString().slice(0, 10),
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
      onboarding: prev.onboarding.map((item) =>
        item.clinicId === params.clinicId && (item.itemKey === 'admin_appointed' || item.itemKey === 'admin_invitation')
          ? { ...item, completed: true, completedAt: new Date().toISOString().slice(0, 10), completedBy: 'Platform Super Admin' }
          : item
      ),
    }));

    addAuditEntry({
      action: 'admin_appointed',
      targetType: 'admin',
      targetId: newAdminId,
      targetName: `${params.adminName} (${clinic.name})`,
      afterValue: `${params.designation} (${params.adminEmail})`,
      reason: `Appointed ${params.adminName} as ${params.designation} for ${clinic.name}.`,
    });

    return { success: true };
  };

  const reassignAdmin = async (params: {
    clinicId: string;
    newAdminName: string;
    newAdminEmail: string;
    newAdminPhone?: string;
    newDesignation: string;
    effectiveDate: string;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const clinic = state.clinics.find((c) => c.id === params.clinicId);
    if (!clinic) return { success: false, error: 'Selected clinic was not found.' };

    const oldAdminName = clinic.appointedAdminName || 'None';
    const newAdminId = `acc-adm-${clinic.code.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
    const newAssignmentId = `asg-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newAssignment: AdminAssignmentRecord = {
      id: newAssignmentId,
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicCode: clinic.code,
      adminUserId: newAdminId,
      adminName: params.newAdminName.trim(),
      adminEmail: params.newAdminEmail.trim().toLowerCase(),
      adminPhone: params.newAdminPhone?.trim() || undefined,
      designation: params.newDesignation.trim(),
      effectiveFrom: params.effectiveDate || nowIso.slice(0, 10),
      status: 'active',
      notes: `Reassigned from ${oldAdminName}. Reason: ${params.reason}`,
      createdAt: nowIso,
    };

    setState((prev) => ({
      ...prev,
      // Archive current active assignment for this clinic to 'reassigned'
      admins: [
        newAssignment,
        ...prev.admins.map((a) =>
          a.clinicId === params.clinicId && a.status === 'active'
            ? { ...a, status: 'reassigned' as AdminAccountStatus, effectiveTo: params.effectiveDate || nowIso.slice(0, 10) }
            : a
        ),
      ],
      clinics: prev.clinics.map((c) =>
        c.id === params.clinicId
          ? {
              ...c,
              appointedAdminId: newAdminId,
              appointedAdminName: params.newAdminName.trim(),
              appointedAdminEmail: params.newAdminEmail.trim().toLowerCase(),
              appointedAdminPhone: params.newAdminPhone?.trim() || undefined,
              appointedAdminDesignation: params.newDesignation.trim(),
              adminAssignmentDate: params.effectiveDate || nowIso.slice(0, 10),
              updatedAt: nowIso,
            }
          : c
      ),
    }));

    addAuditEntry({
      action: 'admin_reassigned',
      targetType: 'admin',
      targetId: newAdminId,
      targetName: `${params.newAdminName} (${clinic.name})`,
      beforeValue: oldAdminName,
      afterValue: params.newAdminName,
      reason: params.reason.trim(),
    });

    return { success: true };
  };

  const toggleAdminStatus = async (
    assignmentId: string,
    newStatus: AdminAccountStatus,
    reason: string
  ): Promise<void> => {
    const target = state.admins.find((a) => a.id === assignmentId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      admins: prev.admins.map((a) =>
        a.id === assignmentId ? { ...a, status: newStatus } : a
      ),
    }));

    addAuditEntry({
      action: 'admin_deactivated',
      targetType: 'admin',
      targetId: target.adminUserId,
      targetName: `${target.adminName} (${target.clinicName})`,
      beforeValue: target.status,
      afterValue: newStatus,
      reason,
    });
  };

  const addAgreement = async (params: {
    clinicId: string;
    agreementReference: string;
    agreementType: AgreementType;
    startDate: string;
    endDate: string;
    signedDate?: string;
    secureDocumentName?: string;
    secureDocumentSize?: string;
    coveredFacilities: string[];
    remarks?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const clinic = state.clinics.find((c) => c.id === params.clinicId);
    if (!clinic) return { success: false, error: 'Clinic not found.' };

    const newId = `agr-${Date.now().toString(36)}`;
    const newAgreement: LicenceAgreementRecord = {
      id: newId,
      clinicId: clinic.id,
      clinicName: clinic.name,
      agreementReference: params.agreementReference.trim().toUpperCase(),
      agreementType: params.agreementType,
      startDate: params.startDate,
      endDate: params.endDate,
      signedDate: params.signedDate,
      status: 'active',
      secureDocumentName: params.secureDocumentName || `${params.agreementReference.trim()}_Signed.pdf`,
      secureDocumentSize: params.secureDocumentSize || '2.1 MB',
      coveredFacilities: params.coveredFacilities,
      remarks: params.remarks?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      agreements: [newAgreement, ...prev.agreements],
      clinics: prev.clinics.map((c) =>
        c.id === params.clinicId
          ? {
              ...c,
              agreementReference: newAgreement.agreementReference,
              agreementStatus: 'active',
              agreementStartDate: newAgreement.startDate,
              agreementEndDate: newAgreement.endDate,
              entitledFacilities: Array.from(new Set([...c.entitledFacilities, ...params.coveredFacilities])),
              enabledModules: Array.from(new Set([...c.enabledModules, ...params.coveredFacilities])),
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
      onboarding: prev.onboarding.map((item) =>
        item.clinicId === params.clinicId && (item.itemKey === 'agreement_uploaded' || item.itemKey === 'agreement_verified')
          ? { ...item, completed: true, completedAt: new Date().toISOString().slice(0, 10), completedBy: 'Platform Super Admin' }
          : item
      ),
    }));

    addAuditEntry({
      action: 'agreement_created',
      targetType: 'agreement',
      targetId: newId,
      targetName: `${newAgreement.agreementReference} (${clinic.name})`,
      afterValue: `Active (${params.startDate} to ${params.endDate})`,
      reason: `Added licence agreement covering [${params.coveredFacilities.join(', ')}]`,
    });

    return { success: true };
  };

  const renewAgreement = async (params: {
    previousAgreementId: string;
    newReference: string;
    agreementType: AgreementType;
    startDate: string;
    endDate: string;
    secureDocumentName?: string;
    secureDocumentSize?: string;
    coveredFacilities: string[];
    remarks?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const prior = state.agreements.find((a) => a.id === params.previousAgreementId);
    if (!prior) return { success: false, error: 'Prior agreement record was not found.' };

    const newId = `agr-${Date.now().toString(36)}`;
    const newAgreement: LicenceAgreementRecord = {
      id: newId,
      clinicId: prior.clinicId,
      clinicName: prior.clinicName,
      agreementReference: params.newReference.trim().toUpperCase(),
      agreementType: params.agreementType,
      startDate: params.startDate,
      endDate: params.endDate,
      signedDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      secureDocumentName: params.secureDocumentName || `${params.newReference.trim()}_Renewed.pdf`,
      secureDocumentSize: params.secureDocumentSize || '2.2 MB',
      previousAgreementId: prior.id,
      coveredFacilities: params.coveredFacilities,
      remarks: params.remarks?.trim() || `Renewed from prior reference ${prior.agreementReference}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      agreements: [
        newAgreement,
        ...prev.agreements.map((a) =>
          a.id === params.previousAgreementId ? { ...a, status: 'renewed' as const, updatedAt: new Date().toISOString() } : a
        ),
      ],
      clinics: prev.clinics.map((c) =>
        c.id === prior.clinicId
          ? {
              ...c,
              agreementReference: newAgreement.agreementReference,
              agreementStatus: 'active',
              agreementStartDate: newAgreement.startDate,
              agreementEndDate: newAgreement.endDate,
              entitledFacilities: params.coveredFacilities,
              enabledModules: params.coveredFacilities,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    }));

    addAuditEntry({
      action: 'agreement_renewed',
      targetType: 'agreement',
      targetId: newId,
      targetName: `${newAgreement.agreementReference} (${prior.clinicName})`,
      beforeValue: prior.agreementReference,
      afterValue: newAgreement.agreementReference,
      reason: `Renewed licence agreement until ${params.endDate}. Prior version archived.`,
    });

    return { success: true };
  };

  const terminateAgreement = async (agreementId: string, reason: string): Promise<void> => {
    const target = state.agreements.find((a) => a.id === agreementId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      agreements: prev.agreements.map((a) =>
        a.id === agreementId ? { ...a, status: 'terminated', remarks: `${a.remarks ? `${a.remarks} ` : ''}Terminated: ${reason}` } : a
      ),
      clinics: prev.clinics.map((c) =>
        c.id === target.clinicId ? { ...c, agreementStatus: 'terminated', updatedAt: new Date().toISOString() } : c
      ),
    }));

    addAuditEntry({
      action: 'agreement_terminated',
      targetType: 'agreement',
      targetId: agreementId,
      targetName: `${target.agreementReference} (${target.clinicName})`,
      afterValue: 'terminated',
      reason,
    });
  };

  const addFacilityToCatalogue = async (facility: Omit<FacilityCatalogueRecord, 'id'>): Promise<void> => {
    const newId = `fac-${Date.now().toString(36)}`;
    const newFac: FacilityCatalogueRecord = {
      ...facility,
      id: newId,
    };
    setState((prev) => ({
      ...prev,
      facilities: [...prev.facilities, newFac],
    }));

    addAuditEntry({
      action: 'facility_entitlement_changed',
      targetType: 'facility',
      targetId: newId,
      targetName: newFac.name,
      afterValue: 'active',
      reason: `Added new catalogue module entry ${newFac.name} (${newFac.code}).`,
    });
  };

  const updateFacilityCatalogue = async (facilityId: string, updates: Partial<FacilityCatalogueRecord>): Promise<void> => {
    setState((prev) => ({
      ...prev,
      facilities: prev.facilities.map((f) => (f.id === facilityId ? { ...f, ...updates } : f)),
    }));
  };

  const updateClinicFacilityEntitlement = async (
    clinicId: string,
    facilityCode: string,
    stateUpdate: { optedStatus?: boolean; entitlementStatus?: boolean; moduleEnabledStatus?: boolean },
    reason: string
  ): Promise<void> => {
    const target = state.clinics.find((c) => c.id === clinicId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      clinics: prev.clinics.map((c) => {
        if (c.id !== clinicId) return c;

        let opted = [...c.optedFacilities];
        let entitled = [...c.entitledFacilities];
        let enabled = [...c.enabledModules];

        if (stateUpdate.optedStatus !== undefined) {
          if (stateUpdate.optedStatus && !opted.includes(facilityCode)) opted.push(facilityCode);
          if (!stateUpdate.optedStatus) opted = opted.filter((f) => f !== facilityCode);
        }

        if (stateUpdate.entitlementStatus !== undefined) {
          if (stateUpdate.entitlementStatus && !entitled.includes(facilityCode)) entitled.push(facilityCode);
          if (!stateUpdate.entitlementStatus) entitled = entitled.filter((f) => f !== facilityCode);
        }

        if (stateUpdate.moduleEnabledStatus !== undefined) {
          if (stateUpdate.moduleEnabledStatus && !enabled.includes(facilityCode)) enabled.push(facilityCode);
          if (!stateUpdate.moduleEnabledStatus) enabled = enabled.filter((f) => f !== facilityCode);
        }

        return {
          ...c,
          optedFacilities: opted,
          entitledFacilities: entitled,
          enabledModules: enabled,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    addAuditEntry({
      action: 'facility_entitlement_changed',
      targetType: 'facility',
      targetId: clinicId,
      targetName: `${facilityCode} (${target.name})`,
      afterValue: `Opted: ${stateUpdate.optedStatus}, Entitled: ${stateUpdate.entitlementStatus}, Enabled: ${stateUpdate.moduleEnabledStatus}`,
      reason,
    });
  };

  const updateOnboardingChecklist = async (
    clinicId: string,
    itemKey: OnboardingChecklistItemKey,
    completed: boolean,
    remarks?: string
  ): Promise<void> => {
    setState((prev) => ({
      ...prev,
      onboarding: prev.onboarding.map((item) =>
        item.clinicId === clinicId && item.itemKey === itemKey
          ? {
              ...item,
              completed,
              completedAt: completed ? new Date().toISOString().slice(0, 10) : undefined,
              completedBy: completed ? 'Platform Super Admin' : undefined,
              remarks,
            }
          : item
      ),
    }));
  };

  const overrideOnboardingItem = async (
    clinicId: string,
    itemKey: OnboardingChecklistItemKey,
    reason: string
  ): Promise<void> => {
    const target = state.clinics.find((c) => c.id === clinicId);
    setState((prev) => ({
      ...prev,
      onboarding: prev.onboarding.map((item) =>
        item.clinicId === clinicId && item.itemKey === itemKey
          ? {
              ...item,
              completed: true,
              isOverridden: true,
              overrideReason: reason,
              completedAt: new Date().toISOString().slice(0, 10),
              completedBy: 'Platform Super Admin',
            }
          : item
      ),
    }));

    addAuditEntry({
      action: 'onboarding_override',
      targetType: 'onboarding',
      targetId: clinicId,
      targetName: `${itemKey} (${target?.name || clinicId})`,
      reason: `Mandatory onboarding condition overridden. Justification: ${reason}`,
    });
  };

  const activateClinicBranch = async (
    clinicId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    return changeClinicStatus(
      clinicId,
      'active',
      reason || 'All onboarding requirements verified and branch authorized for live operational activation.'
    );
  };

  const suspendClinicBranch = async (clinicId: string, reason: string): Promise<void> => {
    await changeClinicStatus(clinicId, 'suspended', reason);
  };

  const dismissAlert = (alertId: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));
  };

  const createAnnouncement = async (title: string, content: string, audience: any, priority: any): Promise<void> => {
    const newAnc: OrganizationAnnouncementRecord = {
      id: `anc-${Date.now().toString(36)}`,
      title: title.trim(),
      content: content.trim(),
      audience,
      priority,
      scheduledDate: new Date().toISOString(),
      createdBy: 'Platform Super Admin',
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      announcements: [newAnc, ...prev.announcements],
    }));

    addAuditEntry({
      action: 'announcement_published',
      targetType: 'platform',
      targetId: newAnc.id,
      targetName: newAnc.title,
      reason: `Broadcasted platform announcement to ${audience}.`,
    });
  };

  const updateSettings = async (updates: Partial<PlatformOrganizationSettings>): Promise<void> => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));

    addAuditEntry({
      action: 'settings_updated',
      targetType: 'platform',
      targetId: 'settings-root',
      targetName: 'Platform Organization Configuration',
      reason: 'Updated central governance preferences, branding, or notice triggers.',
    });
  };

  return (
    <SuperAdminContext.Provider
      value={{
        clinics: state.clinics,
        admins: state.admins,
        agreements: state.agreements,
        facilities: state.facilities,
        onboarding: state.onboarding,
        auditLogs: state.auditLogs,
        alerts: state.alerts,
        announcements: state.announcements,
        settings: state.settings,
        selectedClinicId,
        setSelectedClinicId,
        registerClinic,
        updateClinic,
        changeClinicStatus,
        appointAdmin,
        reassignAdmin,
        toggleAdminStatus,
        addAgreement,
        renewAgreement,
        terminateAgreement,
        addFacilityToCatalogue,
        updateFacilityCatalogue,
        updateClinicFacilityEntitlement,
        updateOnboardingChecklist,
        overrideOnboardingItem,
        activateClinicBranch,
        suspendClinicBranch,
        dismissAlert,
        createAnnouncement,
        updateSettings,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = (): SuperAdminContextType => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
