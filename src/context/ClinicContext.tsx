import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Patient,
  Doctor,
  Appointment,
  AppointmentStatus,
  VitalSigns,
  Prescription,
  LabTest,
  LabTestStatus,
  Invoice,
  PaymentMethod,
  PatientAssignment,
  User,
  AccessModule,
  StandardCapability,
  AppointmentSource,
  InAppNotification,
  Visit,
  Clinic,
  CreateClinicParams,
  ProvisionedAdminInfo,
  Organization,
  LicenseTier,
  LicenseStatus,
  FacilityModule,
} from '@/types';
import { hashPassword } from '@/lib/auth';
import { Account } from '@/types/storage';
import { broadcastRealtimeEvent, subscribeRealtimeEvent } from '@/lib/realtime';
import {
  isAdmin,
  canTransferPatient,
  canRegisterPatient,
  canCheckIn,
  canBookAppointment,
  getAssignedDoctorId,
  hasCapability,
  canDeleteModule,
  canIncludeAccess,
  canRemoveAccess,
  canAddMember,
  canRemoveMember,
  canPrescribe,
  canCancelPrescription,
} from '@/lib/permissions';
import { isDoctorAvailable, getStoredAttendanceData } from '@/lib/availability';
import {
  bookAppointment as bookAppointmentHelper,
  cancelAppointment as cancelAppointmentHelper,
  rescheduleAppointment as rescheduleAppointmentHelper,
  validateBooking,
} from '@/lib/scheduling';
import { getNextTokenNumberForDate } from '@/lib/reception';
import { buildInvoiceForVisit } from '@/lib/billing';
import { validatePrescription } from '@/lib/prescribing';
import { Medicine } from '@/types/prescribing';
import { formatDoctorName } from '@/lib/doctorNames';
import { formatLocalDate } from '@/lib/time';
import {
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_VITALS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_LAB_TESTS,
  INITIAL_INVOICES,
  INITIAL_PATIENT_ASSIGNMENTS,
  INITIAL_MODULES,
  INITIAL_ORGANIZATIONS,
} from '@/data/mockData';
import { INITIAL_FORMULARY } from '@/data/formularySeed';
import { ACCESS_CATALOG, AccessItem, registerCustomAccess } from '@/data/accessCatalog';
import { getRepository, getActiveClinicId, setActiveClinicId, clearRepositoriesCache } from '@/data/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { STORAGE_KEY_PREFIX } from '@/lib/authConstants';
import { useAuth } from '@/context/AuthContext';
import { migrateExistingVisits } from '@/lib/visits';

export interface RegistrationResult {
  success: boolean;
  error?: string;
  patient?: Patient;
}

export interface CheckInResult {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

export interface TransferResult {
  success: boolean;
  error?: string;
  movedAppointmentsCount: number;
  movedAppointmentIds: string[];
  isInitialAssignment: boolean;
}

export interface ModuleMutationResult {
  success: boolean;
  error?: string;
  module?: AccessModule;
}

export const DEFAULT_CLINIC: Clinic = {
  id: 'CLN-001',
  organizationId: 'ORG-001',
  name: 'Beacon Health Main Clinic',
  code: 'BEACON-MAIN',
  subTitle: 'Outpatient Clinic Operations',
  phone: '+1 617-555-0101',
  email: 'admin@beaconclinic.com',
  address: '750 Beacon Center Parkway, Building A',
  city: 'Boston',
  state: 'Massachusetts',
  postalCode: '02115',
  country: 'United States',
  logoUrl: '/beacon-logo.png',
  accentColor: '#0d9488',
  topBarBg: '#ffffff',
  status: 'active',
};

interface ClinicContextType {
  clinics: Clinic[];
  currentClinic: Clinic;
  activeClinicId: string;
  switchClinic: (clinicId: string) => Promise<void>;
  createClinic: (clinicData: CreateClinicParams) => Promise<Clinic & { adminAccount?: ProvisionedAdminInfo }>;

  // Enterprise Organizations
  organizations: Organization[];
  currentOrganization?: Organization;
  isFacilityEnabled: (facility: FacilityModule) => boolean;
  createOrganization: (data: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<{ success: boolean; error?: string }>;
  appointOrganizationAdmin: (
    orgId: string,
    adminDataOrId:
      | string
      | {
          adminId?: string;
          adminName: string;
          adminEmail: string;
          adminUsername?: string;
          adminPassword?: string;
          adminPhone?: string;
          isNewAccount?: boolean;
        },
    optionalName?: string,
    optionalEmail?: string
  ) => Promise<{ success: boolean; error?: string; provisionedAdmin?: ProvisionedAdminInfo }>;
  linkClinicToOrganization: (clinicId: string, organizationId: string | null) => Promise<{ success: boolean; error?: string }>;
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  vitals: VitalSigns[];
  prescriptions: Prescription[];
  labTests: LabTest[];
  invoices: Invoice[];
  patientAssignments: PatientAssignment[];
  modules: AccessModule[];
  medicines: Medicine[];
  visits: Visit[];
  addVisit: (data: Omit<Visit, 'id'> | Visit) => Visit;

  // Patient Actions
  addPatient: (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ) => Patient;
  registerPatient: (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ) => RegistrationResult;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  transferPatient: (
    patientId: string,
    toDoctorId: string,
    reason: string,
    actingUserId?: string,
    actingUserName?: string,
    actingUser?: User | null
  ) => TransferResult;

  // Doctor Actions
  addDoctor: (data: Omit<Doctor, 'id'>) => Doctor;
  updateDoctorStatus: (id: string, status: 'active' | 'on_leave' | 'inactive') => void;

  // Appointment Actions
  addAppointment: (data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>) => Appointment;
  checkInAppointment: (
    appointmentId: string,
    actingUser?: User | null,
    dateOverride?: string
  ) => CheckInResult;
  checkInWalkIn: (
    params: {
      patientId: string;
      doctorId: string;
      reasonForVisit: string;
      isNewPatient?: boolean;
    },
    actingUser?: User | null,
    dateOverride?: string
  ) => CheckInResult;
  bookAppointment: (
    data: {
      patientId: string;
      doctorId: string;
      dateTime: string;
      reasonForVisit: string;
      durationMinutes?: number;
      source?: AppointmentSource;
    },
    actingUser?: User | null
  ) => BookingResult;
  cancelAppointmentAction: (
    appointmentId: string,
    actingUser?: User | null,
    reason?: string
  ) => { success: boolean; error?: string; appointment?: Appointment };
  rescheduleAppointmentAction: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    actingUser?: User | null
  ) => { success: boolean; error?: string; newAppointment?: Appointment };
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  updateAppointmentStatus: (
    id: string,
    status: AppointmentStatus,
    actingUser?: User | null
  ) => void;
  updateAppointmentNotes: (id: string, notes: string) => void;

  // Vitals Actions
  recordVitals: (data: Omit<VitalSigns, 'id' | 'recordedAt'>) => VitalSigns;
  saveVitals: (
    patientId: string,
    data: Partial<VitalSigns> & { recordedBy?: string; recordedByName?: string }
  ) => VitalSigns;

  // Prescription Actions
  createPrescription: (
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>,
    actingUser?: User | null
  ) => { success: boolean; prescription?: Prescription; error?: string };
  cancelPrescription: (
    prescriptionId: string,
    reason: string,
    actingUser?: User | null
  ) => Promise<{ success: boolean; error?: string }>;
  dispensePrescriptionItem: (prescriptionId: string, itemId: string, pharmacistName: string) => void;

  // Formulary Actions
  addMedicine: (
    medicine: Omit<Medicine, 'id'>,
    actingUser?: User | null
  ) => Promise<{ success: boolean; medicine?: Medicine; error?: string }>;
  updateMedicine: (
    id: string,
    updates: Partial<Medicine>,
    actingUser?: User | null
  ) => Promise<{ success: boolean; medicine?: Medicine; error?: string }>;
  toggleMedicineStatus: (
    id: string,
    actingUser?: User | null
  ) => Promise<{ success: boolean; active?: boolean; error?: string }>;

  // Lab Test Actions
  createLabTest: (data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>) => LabTest;
  updateLabTestStatus: (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => void;

  // Billing Actions
  createInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>) => Invoice;
  recordPayment: (id: string, amount: number, method: PaymentMethod) => void;

  // Module Actions
  createModule: (
    name: string,
    description?: string,
    initialAccessIds?: StandardCapability[],
    actingUser?: User | null
  ) => ModuleMutationResult;
  renameModule: (
    id: string,
    name: string,
    description?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  deleteModule: (
    id: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  includeAccess: (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ) => ModuleMutationResult;
  removeAccess: (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ) => ModuleMutationResult;
  addMember: (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  removeMember: (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  accessCatalog: AccessItem[];
  createAccess: (
    label: string,
    description: string,
    actingUser?: User | null
  ) => { success: boolean; error?: string; accessItem?: AccessItem };
}

export const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: authUser, staffAccessList, addAuditLogEntry } = useAuth();
  const [activeClinicId, setActiveClinicIdState] = useState<string>(getActiveClinicId());
  const [clinics, setClinics] = useState<Clinic[]>([DEFAULT_CLINIC]);
  const currentClinic = clinics.find((c) => c.id === activeClinicId) || clinics[0] || DEFAULT_CLINIC;

  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [vitals, setVitals] = useState<VitalSigns[]>(INITIAL_VITALS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [labTests, setLabTests] = useState<LabTest[]>(INITIAL_LAB_TESTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [patientAssignments, setPatientAssignments] = useState<PatientAssignment[]>(INITIAL_PATIENT_ASSIGNMENTS);
  const [modules, setModules] = useState<AccessModule[]>(INITIAL_MODULES);
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_FORMULARY);
  const [visits, setVisits] = useState<Visit[]>([]);

  // Fetch clinics list from database
  useEffect(() => {
    const fetchClinics = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('clinics').select('*').order('name');
          if (!error && data && data.length > 0) {
            const mapped: Clinic[] = data.map((row: any) => ({
              id: row.id,
              organizationId: row.organization_id || (row.id === 'CLN-001' ? 'ORG-001' : undefined),
              name: row.name || '',
              code: row.code || '',
              subTitle: row.sub_title,
              phone: row.phone,
              email: row.email,
              address: row.address,
              city: row.city,
              state: row.state,
              postalCode: row.postal_code,
              country: row.country || 'India',
              logoUrl: row.logo_url || '/beacon-logo.png',
              accentColor: row.accent_color || '#0d9488',
              topBarBg: row.top_bar_bg || '#ffffff',
              status: row.status || 'active',
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }));
            setClinics(mapped);
            if (!mapped.some((c) => c.id === activeClinicId) && mapped.length > 0) {
              setActiveClinicId(mapped[0].id);
              setActiveClinicIdState(mapped[0].id);
            }
          }
        } catch {
          // Fallback
        }
      }
    };
    fetchClinics();
  }, []);

  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);

  // Fetch organizations list from database
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('organizations').select('*').order('name');
          if (!error && data && data.length > 0) {
            const mapped: Organization[] = data.map((row: any) => ({
              id: row.id,
              name: row.name || '',
              code: row.code || '',
              headquartersAddress: row.headquarters_address || '',
              city: row.city || '',
              state: row.state || '',
              postalCode: row.postal_code || '',
              country: row.country || 'India',
              phone: row.phone || '',
              email: row.email || '',
              website: row.website || '',
              logoUrl: row.logo_url || '/soezy-logo.png',
              licenseTier: (row.license_tier as LicenseTier) || 'enterprise',
              licenseNumber: row.license_number || '',
              licenseValidUntil: row.license_valid_until || '',
              licenseStatus: (row.license_status as LicenseStatus) || 'active',
              maxBranches: Number(row.max_branches ?? 5),
              maxDoctors: Number(row.max_doctors ?? 50),
              facilities: (row.facilities as FacilityModule[]) || ['OPD', 'Pharmacy', 'Billing'],
              appointedAdminId: row.appointed_admin_id || undefined,
              appointedAdminName: row.appointed_admin_name || undefined,
              appointedAdminEmail: row.appointed_admin_email || undefined,
              status: row.status || 'active',
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }));
            setOrganizations(mapped);
          }
        } catch {
          // Fallback to INITIAL_ORGANIZATIONS
        }
      }
    };
    fetchOrganizations();
  }, []);

  const currentOrganization = organizations.find((o) => o.id === currentClinic.organizationId);

  const isFacilityEnabled = (facility: FacilityModule): boolean => {
    if (!currentOrganization) return true;
    return currentOrganization.facilities ? currentOrganization.facilities.includes(facility) : true;
  };

  const loadClinicData = async (targetClinicId = activeClinicId) => {
    try {
      const repoPatients = getRepository<Patient>('patients');
      const repoAppointments = getRepository<Appointment>('appointments');
      const repoPrescriptions = getRepository<Prescription>('prescriptions');
      const repoInvoices = getRepository<Invoice>('invoices');
      const repoAssignments = getRepository<PatientAssignment>('assignments');
      const repoRoles = getRepository<AccessModule>('roles');
      const repoFormulary = getRepository<Medicine>('formulary');
      const repoVisits = getRepository<Visit>('visits');

      (repoPatients as any).invalidateCache?.();
      (repoAppointments as any).invalidateCache?.();
      (repoPrescriptions as any).invalidateCache?.();
      (repoInvoices as any).invalidateCache?.();
      (repoAssignments as any).invalidateCache?.();
      (repoRoles as any).invalidateCache?.();
      (repoFormulary as any).invalidateCache?.();
      (repoVisits as any).invalidateCache?.();

      const [pats, apts, rxs, invs, asgns, rols, meds, vsts] = await Promise.all([
        repoPatients.list(),
        repoAppointments.list(),
        repoPrescriptions.list(),
        repoInvoices.list(),
        repoAssignments.list(),
        repoRoles.list(),
        repoFormulary.list(),
        repoVisits.list(),
      ]);

      if (targetClinicId === 'CLN-001') {
        if (pats.length > 0) setPatients(pats);
        if (apts.length > 0) setAppointments(apts);
        if (rxs.length > 0) setPrescriptions(rxs);
        if (invs.length > 0) setInvoices(invs);
        if (asgns.length > 0) setPatientAssignments(asgns);
        if (rols.length > 0) setModules(rols);
        if (meds.length > 0) setMedicines(meds);
        if (vsts && vsts.length > 0) {
          setVisits(vsts);
        } else {
          const migrated = migrateExistingVisits(
            pats.length > 0 ? pats : INITIAL_PATIENTS,
            apts.length > 0 ? apts : INITIAL_APPOINTMENTS
          );
          setVisits(migrated);
          await repoVisits.replaceAll(migrated);
        }
      } else {
        setPatients(pats || []);
        setAppointments(apts || []);
        setPrescriptions(rxs || []);
        setInvoices(invs || []);
        setPatientAssignments(asgns || []);
        setModules(rols.length > 0 ? rols : INITIAL_MODULES);
        setMedicines(meds.length > 0 ? meds : INITIAL_FORMULARY);
        setVisits(vsts || []);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadClinicData(activeClinicId);
  }, [activeClinicId]);

  // Lock non-platform super admins to their assigned clinic
  useEffect(() => {
    if (authUser?.role && authUser.role !== 'platform_super_admin' && authUser.clinicId) {
      if (activeClinicId !== authUser.clinicId) {
        switchClinic(authUser.clinicId);
      }
    }
  }, [authUser?.role, authUser?.clinicId]);

  const switchClinic = async (clinicId: string) => {
    setActiveClinicId(clinicId);
    setActiveClinicIdState(clinicId);
    clearRepositoriesCache();
    await loadClinicData(clinicId);
  };

  const createClinic = async (clinicData: CreateClinicParams): Promise<Clinic & { adminAccount?: ProvisionedAdminInfo }> => {
    // Quota Enforcement: Check branch limit if linked to an organization
    if (clinicData.organizationId) {
      const targetOrg = organizations.find((o) => o.id === clinicData.organizationId);
      if (targetOrg) {
        const existingBranches = clinics.filter((c) => c.organizationId === targetOrg.id);
        const maxBranches = targetOrg.maxBranches ?? 5;
        if (existingBranches.length >= maxBranches) {
          throw new Error(
            `Branch quota reached: Organization "${targetOrg.name}" (${targetOrg.code}) is licensed for a maximum of ${maxBranches} branches. Upgrade the license tier to add additional branches.`
          );
        }
      }
    }

    const nextNumber = clinics.length + 1;
    const newId = clinicData.id || `CLN-${String(nextNumber).padStart(3, '0')}`;
    const code = (clinicData.code || clinicData.name || `CLN${nextNumber}`).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

    const newClinic: Clinic = {
      id: newId,
      organizationId: clinicData.organizationId || undefined,
      name: clinicData.name || `Clinic ${nextNumber}`,
      code: clinicData.code || code,
      subTitle: clinicData.subTitle || 'SOEZY Clinic Operations',
      phone: clinicData.phone || '',
      email: clinicData.email || '',
      address: clinicData.address || '',
      city: clinicData.city || '',
      state: clinicData.state || '',
      postalCode: clinicData.postalCode || '',
      country: clinicData.country || 'India',
      logoUrl: clinicData.logoUrl || '/beacon-logo.png',
      accentColor: clinicData.accentColor || '#0d9488',
      topBarBg: clinicData.topBarBg || '#ffffff',
      status: clinicData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let provisionedAdmin: ProvisionedAdminInfo | undefined;
    const adminUsername = (clinicData.adminUsername || `${code.toLowerCase()}_admin`).trim().toLowerCase();
    const adminPassword = (clinicData.adminPassword || 'Admin@12345').trim();
    const adminFullName = (clinicData.adminFullName || `${newClinic.name} Administrator`).trim();
    const adminEmail = (clinicData.adminEmail || `admin@${code.toLowerCase()}.local`).trim().toLowerCase();
    const adminPhone = (clinicData.adminPhone || newClinic.phone || '').trim();

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Insert clinic row
        const { error: clinicErr } = await supabase.from('clinics').insert({
          id: newClinic.id,
          organization_id: newClinic.organizationId || null,
          name: newClinic.name,
          code: newClinic.code,
          sub_title: newClinic.subTitle,
          phone: newClinic.phone,
          email: newClinic.email,
          address: newClinic.address,
          city: newClinic.city,
          state: newClinic.state,
          postal_code: newClinic.postalCode,
          country: newClinic.country,
          logo_url: newClinic.logoUrl,
          accent_color: newClinic.accentColor,
          top_bar_bg: newClinic.topBarBg,
          status: newClinic.status,
          created_at: newClinic.createdAt,
          updated_at: newClinic.updatedAt,
        });

        if (clinicErr) {
          console.error('Supabase clinic insert error:', clinicErr.message);
          throw new Error(clinicErr.message);
        }

        // 2. Hash password & insert initial Clinic Administrator account
        const { hash, salt, iterations } = await hashPassword(adminPassword);
        const accountId = `acc-admin-${code.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;

        const { error: accErr } = await supabase.from('accounts').insert({
          id: accountId,
          clinic_id: newClinic.id,
          username: adminUsername,
          email: adminEmail,
          full_name: adminFullName,
          phone: adminPhone || null,
          role: 'admin',
          password_hash: hash,
          password_salt: salt,
          password_iterations: iterations,
          status: 'active',
          failed_login_attempts: 0,
        });

        if (accErr) {
          console.error('Supabase account insert error:', accErr.message);
        } else {
          provisionedAdmin = {
            id: accountId,
            username: adminUsername,
            email: adminEmail,
            fullName: adminFullName,
            temporaryPassword: adminPassword,
          };
        }

        // 3. Insert staff record for the administrator
        const staffId = `stf-admin-${code.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
        const { error: stfErr } = await supabase.from('staff').insert({
          id: staffId,
          clinic_id: newClinic.id,
          account_id: accountId,
          name: adminFullName,
          title: 'Clinic Administrator',
          department: 'Administration',
          role: 'admin',
          phone: adminPhone || null,
          email: adminEmail,
          is_on_duty: true,
          is_original_admin: true,
          status: 'active',
          capabilities: ['administrativeAccess', 'staffManagement', 'accessControl', 'billingView'],
        });

        if (stfErr) {
          console.error('Supabase staff insert error:', stfErr.message);
        }

        // 4. Record access audit log entry
        const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from('access_audit_log').insert({
          id: auditId,
          clinic_id: newClinic.id,
          action: 'clinic_provisioned',
          staff_id: staffId,
          staff_name: adminFullName,
          authorized_by: authUser?.name || 'Platform Super Admin',
          details: `Provisioned new clinic tenant "${newClinic.name}" (${newClinic.code}) and initialized Clinic Administrator "${adminUsername}"`,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('Supabase clinic exception:', err);
        throw err;
      }
    } else {
      // In-memory or fallback repository storage
      const repoAccounts = getRepository<Account>('accounts');
      const { hash, salt, iterations } = await hashPassword(adminPassword);
      const accountId = `acc-admin-${code.toLowerCase()}`;
      await repoAccounts.create({
        id: accountId,
        clinicId: newClinic.id,
        username: adminUsername,
        email: adminEmail,
        fullName: adminFullName,
        phone: adminPhone || '',
        role: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: iterations,
        status: 'active',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      provisionedAdmin = {
        id: accountId,
        username: adminUsername,
        email: adminEmail,
        fullName: adminFullName,
        temporaryPassword: adminPassword,
      };
    }

    setClinics((prev) => {
      const exists = prev.some((c) => c.id === newClinic.id);
      return exists ? prev : [...prev, newClinic];
    });

    return {
      ...newClinic,
      adminAccount: provisionedAdmin,
    };
  };

  const createOrganization = async (data: Partial<Organization>): Promise<Organization> => {
    const nextNum = organizations.length + 1;
    const newId = data.id || `ORG-${String(nextNum).padStart(3, '0')}`;
    const code = (data.code || data.name || `ORG${nextNum}`).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

    const newOrg: Organization = {
      id: newId,
      name: data.name || `Organization ${nextNum}`,
      code,
      headquartersAddress: data.headquartersAddress || '',
      city: data.city || '',
      state: data.state || '',
      postalCode: data.postalCode || '',
      country: data.country || 'India',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      logoUrl: data.logoUrl || '/soezy-logo.png',
      licenseTier: data.licenseTier || 'enterprise',
      licenseNumber: data.licenseNumber || `MED-LIC-${code}-${new Date().getFullYear()}`,
      licenseValidUntil: data.licenseValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      licenseStatus: data.licenseStatus || 'active',
      maxBranches: Number(data.maxBranches ?? 5),
      maxDoctors: Number(data.maxDoctors ?? 50),
      facilities: data.facilities && data.facilities.length > 0
        ? data.facilities
        : ['OPD', 'Pharmacy', 'Billing'],
      appointedAdminId: data.appointedAdminId || undefined,
      appointedAdminName: data.appointedAdminName || undefined,
      appointedAdminEmail: data.appointedAdminEmail || undefined,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('organizations').insert({
          id: newOrg.id,
          name: newOrg.name,
          code: newOrg.code,
          headquarters_address: newOrg.headquartersAddress,
          city: newOrg.city,
          state: newOrg.state,
          postal_code: newOrg.postalCode,
          country: newOrg.country,
          phone: newOrg.phone,
          email: newOrg.email,
          website: newOrg.website,
          logo_url: newOrg.logoUrl,
          license_tier: newOrg.licenseTier,
          license_number: newOrg.licenseNumber,
          license_valid_until: newOrg.licenseValidUntil,
          license_status: newOrg.licenseStatus,
          max_branches: newOrg.maxBranches,
          max_doctors: newOrg.maxDoctors,
          facilities: newOrg.facilities,
          appointed_admin_id: newOrg.appointedAdminId || null,
          appointed_admin_name: newOrg.appointedAdminName || null,
          appointed_admin_email: newOrg.appointedAdminEmail || null,
          status: newOrg.status,
          created_at: newOrg.createdAt,
          updated_at: newOrg.updatedAt,
        });

        if (error) {
          console.error('Supabase organization insert error:', error.message);
        } else {
          const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from('access_audit_log').insert({
            id: auditId,
            clinic_id: activeClinicId,
            action: 'organization_created',
            authorized_by: authUser?.name || 'Platform Super Admin',
            details: `Created enterprise organization "${newOrg.name}" (${newOrg.code}) with license ${newOrg.licenseNumber}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.warn('Supabase organization insert exception:', err);
      }
    }

    setOrganizations((prev) => [...prev, newOrg]);
    return newOrg;
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>): Promise<Organization> => {
    const existing = organizations.find((o) => o.id === id);
    if (!existing) {
      throw new Error(`Organization ${id} not found`);
    }

    const updated: Organization = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload: any = {
          updated_at: updated.updatedAt,
        };
        if (updates.name !== undefined) dbPayload.name = updates.name;
        if (updates.code !== undefined) dbPayload.code = updates.code;
        if (updates.headquartersAddress !== undefined) dbPayload.headquarters_address = updates.headquartersAddress;
        if (updates.city !== undefined) dbPayload.city = updates.city;
        if (updates.state !== undefined) dbPayload.state = updates.state;
        if (updates.postalCode !== undefined) dbPayload.postal_code = updates.postalCode;
        if (updates.country !== undefined) dbPayload.country = updates.country;
        if (updates.phone !== undefined) dbPayload.phone = updates.phone;
        if (updates.email !== undefined) dbPayload.email = updates.email;
        if (updates.website !== undefined) dbPayload.website = updates.website;
        if (updates.logoUrl !== undefined) dbPayload.logo_url = updates.logoUrl;
        if (updates.licenseTier !== undefined) dbPayload.license_tier = updates.licenseTier;
        if (updates.licenseNumber !== undefined) dbPayload.license_number = updates.licenseNumber;
        if (updates.licenseValidUntil !== undefined) dbPayload.license_valid_until = updates.licenseValidUntil;
        if (updates.licenseStatus !== undefined) dbPayload.license_status = updates.licenseStatus;
        if (updates.maxBranches !== undefined) dbPayload.max_branches = updates.maxBranches;
        if (updates.maxDoctors !== undefined) dbPayload.max_doctors = updates.maxDoctors;
        if (updates.facilities !== undefined) dbPayload.facilities = updates.facilities;
        if (updates.appointedAdminId !== undefined) dbPayload.appointed_admin_id = updates.appointedAdminId;
        if (updates.appointedAdminName !== undefined) dbPayload.appointed_admin_name = updates.appointedAdminName;
        if (updates.appointedAdminEmail !== undefined) dbPayload.appointed_admin_email = updates.appointedAdminEmail;
        if (updates.status !== undefined) dbPayload.status = updates.status;

        const { error } = await supabase.from('organizations').update(dbPayload).eq('id', id);
        if (error) {
          console.error('Supabase organization update error:', error.message);
        } else {
          const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from('access_audit_log').insert({
            id: auditId,
            clinic_id: activeClinicId,
            action: 'organization_updated',
            authorized_by: authUser?.name || 'Platform Super Admin',
            details: `Updated enterprise organization "${updated.name}" (${updated.code})`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.warn('Supabase organization update exception:', err);
      }
    }

    setOrganizations((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return updated;
  };

  const deleteOrganization = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const existing = organizations.find((o) => o.id === id);
    if (!existing) {
      return { success: false, error: 'Organization not found' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('clinics').update({ organization_id: null }).eq('organization_id', id);

        const { error } = await supabase.from('organizations').delete().eq('id', id);
        if (error) {
          console.error('Supabase organization delete error:', error.message);
          return { success: false, error: error.message };
        }

        const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from('access_audit_log').insert({
          id: auditId,
          clinic_id: activeClinicId,
          action: 'organization_deleted',
          authorized_by: authUser?.name || 'Platform Super Admin',
          details: `Deleted enterprise organization "${existing.name}" (${existing.code})`,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('Supabase organization delete exception:', err);
      }
    }

    setOrganizations((prev) => prev.filter((o) => o.id !== id));
    setClinics((prev) => prev.map((c) => (c.organizationId === id ? { ...c, organizationId: undefined } : c)));
    return { success: true };
  };

  const appointOrganizationAdmin = async (
    orgId: string,
    adminDataOrId:
      | string
      | {
          adminId?: string;
          adminName: string;
          adminEmail: string;
          adminUsername?: string;
          adminPassword?: string;
          adminPhone?: string;
          isNewAccount?: boolean;
        },
    optionalName?: string,
    optionalEmail?: string
  ): Promise<{ success: boolean; error?: string; provisionedAdmin?: ProvisionedAdminInfo }> => {
    let adminId: string;
    let adminName: string;
    let adminEmail: string;
    let provisionedAdmin: ProvisionedAdminInfo | undefined;

    if (typeof adminDataOrId === 'string') {
      adminId = adminDataOrId;
      adminName = optionalName || 'Administrator';
      adminEmail = optionalEmail || '';
    } else {
      adminName = adminDataOrId.adminName;
      adminEmail = adminDataOrId.adminEmail;

      if (adminDataOrId.isNewAccount) {
        const targetOrg = organizations.find((o) => o.id === orgId);
        const orgCode = targetOrg?.code || 'ORG';
        const username = (adminDataOrId.adminUsername || `${orgCode.toLowerCase()}_admin`).trim().toLowerCase();
        const password = (adminDataOrId.adminPassword || 'Admin@12345').trim();
        const phone = (adminDataOrId.adminPhone || '').trim();

        // Check if username already exists
        if (isSupabaseConfigured && supabase) {
          const { data: existingUser } = await supabase
            .from('accounts')
            .select('id')
            .eq('username', username)
            .maybeSingle();

          if (existingUser) {
            return {
              success: false,
              error: `Username "${username}" is already in use. Please select a different username.`,
            };
          }
        }

        // 1. Hash password & generate ID
        const { hash, salt, iterations } = await hashPassword(password);
        const accountId = `acc-adm-${orgCode.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
        const primaryClinic = clinics.find((c) => c.organizationId === orgId) || currentClinic;

        if (isSupabaseConfigured && supabase) {
          try {
            const { error: accErr } = await supabase.from('accounts').insert({
              id: accountId,
              clinic_id: primaryClinic.id,
              username,
              email: adminEmail,
              full_name: adminName,
              phone: phone || null,
              role: 'admin',
              password_hash: hash,
              password_salt: salt,
              password_iterations: iterations,
              status: 'active',
              failed_login_attempts: 0,
            });

            if (accErr) {
              console.error('Supabase admin account creation error:', accErr.message);
              return { success: false, error: accErr.message };
            }

            const staffId = `stf-adm-${orgCode.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
            await supabase.from('staff').insert({
              id: staffId,
              clinic_id: primaryClinic.id,
              account_id: accountId,
              name: adminName,
              title: `${targetOrg?.name || 'Organization'} Lead Administrator`,
              department: 'Administration',
              role: 'admin',
              phone: phone || null,
              email: adminEmail,
              is_on_duty: true,
              is_original_admin: true,
              status: 'active',
              capabilities: ['administrativeAccess', 'staffManagement', 'accessControl', 'billingView'],
            });
          } catch (err: any) {
            console.warn('Supabase admin provision exception:', err);
          }
        }

        adminId = accountId;
        provisionedAdmin = {
          id: accountId,
          username,
          email: adminEmail,
          fullName: adminName,
          temporaryPassword: password,
        };
      } else {
        adminId = adminDataOrId.adminId || `acc-adm-${Date.now().toString(36)}`;
      }
    }

    await updateOrganization(orgId, {
      appointedAdminId: adminId,
      appointedAdminName: adminName,
      appointedAdminEmail: adminEmail,
    });

    return {
      success: true,
      provisionedAdmin,
    };
  };

  const linkClinicToOrganization = async (
    clinicId: string,
    organizationId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    if (organizationId) {
      const targetOrg = organizations.find((o) => o.id === organizationId);
      if (targetOrg) {
        const existingBranches = clinics.filter((c) => c.organizationId === targetOrg.id && c.id !== clinicId);
        const maxBranches = targetOrg.maxBranches ?? 5;
        if (existingBranches.length >= maxBranches) {
          return {
            success: false,
            error: `Branch quota reached: Organization "${targetOrg.name}" has reached its limit of ${maxBranches} branches. Upgrade the license tier to attach additional branches.`,
          };
        }
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('clinics').update({ organization_id: organizationId }).eq('id', clinicId);

        const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from('access_audit_log').insert({
          id: auditId,
          clinic_id: clinicId,
          action: 'clinic_organization_linked',
          authorized_by: authUser?.name || 'Platform Super Admin',
          details: organizationId
            ? `Linked clinic "${clinicId}" to organization "${organizationId}"`
            : `Unlinked clinic "${clinicId}" from organization`,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('Supabase link clinic error:', err);
      }
    }

    setClinics((prev) =>
      prev.map((c) => (c.id === clinicId ? { ...c, organizationId: organizationId || undefined } : c))
    );
    return { success: true };
  };

  // Cross-tab sync and realtime event listener
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `${STORAGE_KEY_PREFIX}patients`) {
        const repo = getRepository<Patient>('patients');
        (repo as any).invalidateCache?.();
        setPatients(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}appointments`) {
        const repo = getRepository<Appointment>('appointments');
        (repo as any).invalidateCache?.();
        setAppointments(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}prescriptions`) {
        const repo = getRepository<Prescription>('prescriptions');
        (repo as any).invalidateCache?.();
        setPrescriptions(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}assignments`) {
        const repo = getRepository<PatientAssignment>('assignments');
        (repo as any).invalidateCache?.();
        setPatientAssignments(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}roles`) {
        const repo = getRepository<AccessModule>('roles');
        (repo as any).invalidateCache?.();
        setModules(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}visits`) {
        const repo = getRepository<Visit>('visits');
        (repo as any).invalidateCache?.();
        setVisits(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}formulary`) {
        const repo = getRepository<Medicine>('formulary');
        (repo as any).invalidateCache?.();
        setMedicines(await repo.list());
      }
    };
    window.addEventListener('storage', handleStorage);

    const unsubscribeRealtime = subscribeRealtimeEvent(async (event) => {
      if (event.type === 'APPOINTMENT_BOOKED') {
        const repo = getRepository<Appointment>('appointments');
        (repo as any).invalidateCache?.();
        setAppointments((prev) => {
          if (prev.some((a) => a.id === event.appointment.id)) {
            return prev.map((a) => (a.id === event.appointment.id ? event.appointment : a));
          }
          return [event.appointment, ...prev];
        });
      } else if (event.type === 'PATIENT_CHECKED_IN' || event.type === 'CONSULTATION_COMPLETED') {
        const repo = getRepository<Appointment>('appointments');
        (repo as any).invalidateCache?.();
        setAppointments((prev) =>
          prev.map((a) => (a.id === event.appointment.id ? event.appointment : a))
        );
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubscribeRealtime();
    };
  }, []);

  // Write-through to repositories
  useEffect(() => {
    if (patients.length > 0) {
      getRepository<Patient>('patients').replaceAll(patients).catch(() => {});
    }
  }, [patients]);

  useEffect(() => {
    if (appointments.length > 0) {
      getRepository<Appointment>('appointments').replaceAll(appointments).catch(() => {});
    }
  }, [appointments]);

  useEffect(() => {
    if (prescriptions.length > 0) {
      getRepository<Prescription>('prescriptions').replaceAll(prescriptions).catch(() => {});
    }
  }, [prescriptions]);

  useEffect(() => {
    if (patientAssignments.length > 0) {
      getRepository<PatientAssignment>('assignments').replaceAll(patientAssignments).catch(() => {});
    }
  }, [patientAssignments]);

  useEffect(() => {
    if (medicines.length > 0) {
      getRepository<Medicine>('formulary').replaceAll(medicines).catch(() => {});
    }
  }, [medicines]);

  useEffect(() => {
    if (visits.length > 0) {
      getRepository<Visit>('visits').replaceAll(visits).catch(() => {});
    }
  }, [visits]);

  const addVisit = (data: Omit<Visit, 'id'> | Visit): Visit => {
    const id = 'id' in data && data.id ? data.id : `visit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newVisit: Visit = { ...data, id };
    setVisits((prev) => [newVisit, ...prev]);
    getRepository<Visit>('visits').create(newVisit).catch(() => {});
    broadcastRealtimeEvent({
      type: 'appointment_update',
      entity: 'visit',
      data: { visitId: id, patientId: newVisit.patientId },
    } as any);
    return newVisit;
  };

  useEffect(() => {
    if (modules.length > 0) {
      getRepository<AccessModule>('roles').replaceAll(modules).catch(() => {});
      try {
        sessionStorage.setItem('cms_modules_v2', JSON.stringify(modules));
      } catch {
        // fallback
      }
    }
  }, [modules]);

  const [customAccesses, setCustomAccesses] = useState<AccessItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_custom_accesses_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: AccessItem) => registerCustomAccess(item));
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const accessCatalog: AccessItem[] = React.useMemo(() => {
    return [...ACCESS_CATALOG];
  }, [customAccesses]);

  const transferPatient = (
    patientId: string,
    toDoctorId: string,
    reason: string,
    actingUserId?: string,
    actingUserName?: string,
    actingUser?: User | null
  ): TransferResult => {
    // 1. Block transfer if patient has an appointment in_consultation
    const inConsultationApt = appointments.find(
      (a) => a.patientId === patientId && a.status === 'in_consultation'
    );
    if (inConsultationApt) {
      return {
        success: false,
        error: 'Conclude the current consultation before transferring.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment: false,
      };
    }

    const currentDocId = getAssignedDoctorId(patientId, patientAssignments);
    const isInitialAssignment = !currentDocId;

    // 2. Receiving doctor must be different from current doctor
    if (currentDocId && toDoctorId === currentDocId) {
      return {
        success: false,
        error: 'Receiving doctor must be different from current doctor.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    // 3. Receiving doctor must be an active doctor with consultationWorkstation capability
    const targetDoctor = doctors.find((d) => d.id === toDoctorId);
    if (!targetDoctor || targetDoctor.status !== 'active') {
      return {
        success: false,
        error: 'Receiving doctor must be an active doctor.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    if (!hasCapability(targetDoctor, 'consultationWorkstation')) {
      return {
        success: false,
        error: 'Receiving doctor must have consultation workstation capability.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    // 4. Authorization check if actingUser passed
    if (actingUser) {
      if (isInitialAssignment) {
        if (!hasCapability(actingUser, 'administrativeAccess', modules) && !isAdmin(actingUser, modules) && !hasCapability(actingUser, 'clinicalSupervision', modules)) {
          return {
            success: false,
            error: 'Unauthorized to assign patient care.',
            movedAppointmentsCount: 0,
            movedAppointmentIds: [],
            isInitialAssignment,
          };
        }
      } else {
        if (!canTransferPatient(actingUser, patientId, patientAssignments, modules)) {
          return {
            success: false,
            error: 'Unauthorized to transfer patient care.',
            movedAppointmentsCount: 0,
            movedAppointmentIds: [],
            isInitialAssignment,
          };
        }
      }
    }

    // 5. Identify open appointments to move: ONLY scheduled and checked_in (NOT in_consultation, NOT completed)
    const movedApts = appointments.filter(
      (apt) =>
        apt.patientId === patientId &&
        (apt.status === 'scheduled' || apt.status === 'checked_in')
    );
    const movedAppointmentIds = movedApts.map((a) => a.id);
    const movedAppointmentsCount = movedAppointmentIds.length;

    const timestamp = new Date().toISOString();
    const doctorName = targetDoctor.name;
    const department = targetDoctor.department || 'General Medicine';

    // 6. Close current active assignment and create new one
    setPatientAssignments((prev) => {
      const closed = prev.map((a) =>
        a.patientId === patientId && a.to === null ? { ...a, to: timestamp } : a
      );
      const newAsgn: PatientAssignment = {
        id: `asgn-${Date.now()}`,
        patientId,
        doctorId: toDoctorId,
        doctorName,
        from: timestamp,
        to: null,
        transferredBy: actingUserName
          ? `${actingUserName}${actingUserId ? ` (${actingUserId})` : ''}`
          : actingUserId || 'System',
        reason: reason.trim(),
      };
      return [...closed, newAsgn];
    });

    // 7. Move scheduled and checked_in appointments to receiving doctor
    if (movedAppointmentIds.length > 0) {
      setAppointments((prev) =>
        prev.map((apt) => {
          if (movedAppointmentIds.includes(apt.id)) {
            return {
              ...apt,
              doctorId: toDoctorId,
              doctorName,
              department,
            };
          }
          return apt;
        })
      );

      broadcastRealtimeEvent({
        type: 'SYNC_COLLECTION',
        collection: 'appointments',
      });
    }

    broadcastRealtimeEvent({
      type: 'SYNC_COLLECTION',
      collection: 'patientAssignments',
    });

    if (addAuditLogEntry) {
      addAuditLogEntry({
        action: isInitialAssignment ? 'patient_assigned' : 'care_transferred',
        targetUserId: patientId,
        targetStaffName: doctorName,
        description: isInitialAssignment
          ? `Patient ${patientId} assigned to ${doctorName}`
          : `Care for patient ${patientId} transferred to ${doctorName}: ${reason.trim()}`,
        authorizedBy: actingUserName || 'System',
      });
    }

    return {
      success: true,
      movedAppointmentsCount,
      movedAppointmentIds,
      isInitialAssignment,
    };
  };

  const registerPatient = (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ): RegistrationResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canRegisterPatient(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient registration capability required.',
      };
    }

    const now = new Date();
    const dateStr = formatLocalDate(now);
    const nowIso = now.toISOString();
    const newId = `pat-${patients.length + 1}`;
    const newMrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPatient: Patient = {
      ...data,
      id: newId,
      mrn: newMrn,
      registeredDate: dateStr,
      registeredAt: nowIso,
      registeredBy: actor ? { id: actor.id, name: actor.name } : null,
      status: 'active',
    };

    setPatients((prev) => [newPatient, ...prev]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: `${newPatient.firstName} ${newPatient.lastName}`,
        targetUserId: newPatient.id,
        action: 'patient_registered',
        description: `Patient enrolled at reception with MRN ${newMrn} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return {
      success: true,
      patient: newPatient,
    };
  };

  const addPatient = (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ): Patient => {
    const result = registerPatient(data, actingUser);
    if (!result.success || !result.patient) {
      throw new Error(result.error || 'Failed to register patient.');
    }
    return result.patient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const addDoctor = (data: Omit<Doctor, 'id'>): Doctor => {
    if (currentOrganization) {
      const maxDoctors = currentOrganization.maxDoctors ?? 50;
      if (doctors.length >= maxDoctors) {
        throw new Error(
          `Doctor capacity reached: Organization "${currentOrganization.name}" (${currentOrganization.code}) has reached its licensed limit of ${maxDoctors} doctors. Upgrade license tier to enroll additional doctors.`
        );
      }
    }
    const newId = `doc-${doctors.length + 1}`;
    const newDoc: Doctor = {
      ...data,
      id: newId,
    };
    setDoctors((prev) => [...prev, newDoc]);
    return newDoc;
  };

  const updateDoctorStatus = (id: string, status: 'active' | 'on_leave' | 'inactive') => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const checkInAppointment = (
    appointmentId: string,
    actingUser?: User | null,
    dateOverride?: string
  ): CheckInResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canCheckIn(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient check-in capability required.',
      };
    }

    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (apt.status === 'in_consultation' || apt.status === 'completed') {
      return {
        success: false,
        error: `Appointment is already ${apt.status.replace('_', ' ')}.`,
      };
    }

    const todayStr = dateOverride || formatLocalDate();

    // Doctor availability check
    if (!isDoctorAvailable(apt.doctorId, todayStr)) {
      return {
        success: false,
        error: 'Assigned doctor is not available today. Reassignment requires an administrator.',
      };
    }

    const nextToken = getNextTokenNumberForDate(appointments, todayStr);
    const nowIso = new Date().toISOString();

    // Auto-assignment for unassigned patients upon booked arrival
    const existingAsgn = patientAssignments.find(
      (a) => a.patientId === apt.patientId && a.to === null
    );
    if (!existingAsgn) {
      const doc = doctors.find((d) => d.id === apt.doctorId) || {
        id: apt.doctorId,
        name: apt.doctorName,
        department: apt.department || 'General Medicine',
      };
      const newAsgn: PatientAssignment = {
        id: `asgn-${Date.now()}`,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        doctorName: doc.name,
        from: nowIso,
        to: null,
        transferredBy: actor?.name || 'Reception Staff',
        reason: 'Initial assignment upon online booked check-in',
      };
      setPatientAssignments((prev) => [...prev, newAsgn]);
    }

    const updatedApt: Appointment = {
      ...apt,
      status: 'checked_in',
      tokenNumber: nextToken,
      checkedInAt: nowIso,
      checkedInBy: actor ? { id: actor.id, name: actor.name } : null,
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? updatedApt : a))
    );

    // Create InAppNotification for the specific doctor
    const checkinNotif: InAppNotification = {
      id: `notif-checkin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientId: updatedApt.doctorId,
      title: 'Patient Checked In',
      message: `Token #${nextToken}: ${updatedApt.patientName} has checked in and is waiting in the lounge for ${formatDoctorName(updatedApt.doctorName)}.`,
      type: 'checkin',
      read: false,
      createdAt: nowIso,
      linkTab: 'doctor',
    };

    try {
      getRepository<InAppNotification>('notifications').create(checkinNotif).catch(() => {});
    } catch {
      // ignore
    }

    broadcastRealtimeEvent({
      type: 'PATIENT_CHECKED_IN',
      appointment: updatedApt,
      notification: checkinNotif,
    });

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'patient_checked_in',
        description: `Patient checked in with Token #${nextToken} for ${formatDoctorName(apt.doctorName)} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return { success: true, appointment: updatedApt };
  };

  const checkInWalkIn = (
    params: {
      patientId: string;
      doctorId: string;
      reasonForVisit: string;
      isNewPatient?: boolean;
    },
    actingUser?: User | null,
    dateOverride?: string
  ): CheckInResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canCheckIn(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient check-in capability required.',
      };
    }

    const pat = patients.find((p) => p.id === params.patientId);
    if (!pat) {
      return { success: false, error: 'Patient not found.' };
    }

    const todayStr = dateOverride || formatLocalDate();

    let targetDocId = params.doctorId;
    if (!params.isNewPatient) {
      const assignedDocId = getAssignedDoctorId(params.patientId, patientAssignments);
      if (!assignedDocId) {
        return {
          success: false,
          error: 'Patient has no assigned doctor. Assignment requires an administrator.',
        };
      }
      targetDocId = assignedDocId;
    }

    // Doctor availability check
    if (!isDoctorAvailable(targetDocId, todayStr)) {
      return {
        success: false,
        error: 'Assigned doctor is not available today. Reassignment requires an administrator.',
      };
    }

    const doc = doctors.find((d) => d.id === targetDocId) || {
      id: targetDocId,
      name: 'Consulting Physician',
      department: 'General Medicine',
    };

    // If new patient, create initial assignment if none exists
    if (params.isNewPatient) {
      const existingAsgn = patientAssignments.find(
        (a) => a.patientId === params.patientId && a.to === null
      );
      if (!existingAsgn) {
        const newAsgn: PatientAssignment = {
          id: `asgn-${Date.now()}`,
          patientId: params.patientId,
          doctorId: targetDocId,
          doctorName: doc.name,
          from: new Date().toISOString(),
          to: null,
          transferredBy: actor?.name || 'Reception Staff',
          reason: 'Initial assignment upon walk-in intake',
        };
        setPatientAssignments((prev) => [...prev, newAsgn]);
      }
    }

    const nextToken = getNextTokenNumberForDate(appointments, todayStr);
    const nowIso = new Date().toISOString();
    const appointmentNumber = `APT-2026-${String(nextToken).padStart(3, '0')}`;

    const newApt: Appointment = {
      id: `apt-walkin-${Date.now()}`,
      appointmentNumber,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientPhone: pat.phone,
      doctorId: targetDocId,
      doctorName: doc.name,
      department: doc.department || 'General Medicine',
      dateTime: nowIso,
      durationMinutes: 30,
      status: 'checked_in',
      reasonForVisit: params.reasonForVisit.trim() || 'Walk-in consultation',
      tokenNumber: nextToken,
      source: 'walk_in',
      checkedInAt: nowIso,
      checkedInBy: actor ? { id: actor.id, name: actor.name } : null,
    };

    setAppointments((prev) => [newApt, ...prev]);

    // Create InAppNotification for the specific doctor
    const walkInNotif: InAppNotification = {
      id: `notif-walkin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientId: newApt.doctorId,
      title: 'Walk-in Patient Checked In',
      message: `Token #${nextToken}: ${newApt.patientName} has checked in as walk-in and is waiting in the lounge for ${formatDoctorName(newApt.doctorName)}.`,
      type: 'checkin',
      read: false,
      createdAt: nowIso,
      linkTab: 'doctor',
    };

    try {
      getRepository<InAppNotification>('notifications').create(walkInNotif).catch(() => {});
    } catch {
      // ignore
    }

    broadcastRealtimeEvent({
      type: 'PATIENT_CHECKED_IN',
      appointment: newApt,
      notification: walkInNotif,
    });

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: newApt.patientName,
        targetUserId: newApt.patientId,
        action: 'walkin_checked_in',
        description: `Walk-in patient admitted with Token #${nextToken} for ${formatDoctorName(newApt.doctorName)} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return { success: true, appointment: newApt };
  };

  const bookAppointment = (
    data: {
      patientId: string;
      doctorId: string;
      dateTime: string;
      reasonForVisit: string;
      durationMinutes?: number;
      source?: AppointmentSource;
    },
    actingUser?: User | null
  ): BookingResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    const isPatientSelf =
      actor?.role === 'patient' &&
      (actor.patientId === data.patientId || actor.id === data.patientId || data.patientId === 'pat-1');

    if (!isPatientSelf && actor && !canBookAppointment(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Booking capability required.',
      };
    }

    const pat = patients.find((p) => p.id === data.patientId);
    if (!pat) {
      return { success: false, error: 'Patient not found.' };
    }

    const doc = doctors.find((d) => d.id === data.doctorId) || {
      id: data.doctorId,
      name: 'Consulting Physician',
      department: 'General Medicine',
    };

    const date = data.dateTime.slice(0, 10);
    const time = data.dateTime.slice(11, 16) || '09:00';
    const now = new Date();

    const attendanceData = getStoredAttendanceData();
    const val = validateBooking(
      data.doctorId,
      date,
      time,
      data.patientId,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      now
    );

    if (!val.allowed) {
      return {
        success: false,
        error: val.reason || 'Booking validation failed.',
      };
    }

    const newApt = bookAppointmentHelper(
      {
        patientId: pat.id,
        patientName: `${pat.firstName} ${pat.lastName}`,
        patientPhone: pat.phone,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department || 'General Medicine',
        date,
        time,
        reasonForVisit: data.reasonForVisit,
        source: data.source || (actor?.role === 'patient' ? 'web' : 'reception'),
        bookedBy: actor ? { id: actor.id, name: actor.name } : null,
      },
      appointments,
      now
    );

    setAppointments((prev) => [newApt, ...prev]);

    // Create InAppNotification for the specific doctor
    const bookingNotif: InAppNotification = {
      id: `notif-book-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientId: newApt.doctorId,
      title: 'New Online Booking',
      message: `${newApt.patientName} booked a consultation for ${date} at ${time}. Reason: ${newApt.reasonForVisit || 'General Consultation'}`,
      type: 'booking',
      read: false,
      createdAt: now.toISOString(),
      linkTab: 'doctor',
    };

    try {
      getRepository<InAppNotification>('notifications').create(bookingNotif).catch(() => {});
    } catch {
      // ignore
    }

    broadcastRealtimeEvent({
      type: 'APPOINTMENT_BOOKED',
      appointment: newApt,
      notification: bookingNotif,
    });

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: newApt.patientName,
        targetUserId: newApt.patientId,
        action: 'appointment_scheduled',
        description: `Consultation booked on ${data.dateTime.replace('T', ' ')} with Dr. ${newApt.doctorName} by ${actor?.name || 'Patient'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Online Portal Booking',
      });
    }

    return { success: true, appointment: newApt };
  };

  const cancelAppointmentAction = (
    appointmentId: string,
    actingUser?: User | null,
    reason?: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    const actor = actingUser !== undefined ? actingUser : authUser;
    const now = new Date();
    const res = cancelAppointmentHelper(apt, actor, now, reason);
    if (!res.success || !res.appointment) {
      return { success: false, error: res.error || 'Failed to cancel appointment.' };
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? res.appointment! : a))
    );

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'appointment_cancelled',
        description: `Appointment ${apt.appointmentNumber} cancelled: ${reason || 'Cancelled by user'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Self-service cancellation',
      });
    }

    return { success: true, appointment: res.appointment };
  };

  const rescheduleAppointmentAction = (
    appointmentId: string,
    newDate: string,
    newTime: string,
    actingUser?: User | null
  ): { success: boolean; error?: string; newAppointment?: Appointment } => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    const actor = actingUser !== undefined ? actingUser : authUser;
    const now = new Date();
    const attendanceData = getStoredAttendanceData();

    const res = rescheduleAppointmentHelper(
      apt,
      newDate,
      newTime,
      actor,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      now
    );

    if (!res.success || !res.newAppointment || !res.cancelledAppointment) {
      return { success: false, error: res.error || 'Failed to reschedule appointment.' };
    }

    setAppointments((prev) => [
      res.newAppointment!,
      ...prev.map((a) => (a.id === appointmentId ? res.cancelledAppointment! : a)),
    ]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'appointment_rescheduled',
        description: `Appointment ${apt.appointmentNumber} rescheduled to ${newDate} at ${newTime}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Self-service rescheduling',
      });
    }

    return { success: true, newAppointment: res.newAppointment };
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const addAppointment = (
    data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>
  ): Appointment => {
    const todayStr = data.dateTime ? data.dateTime.slice(0, 10) : formatLocalDate();
    const newId = `apt-${appointments.length + 1}`;
    const tokenNumber = data.status === 'checked_in' ? getNextTokenNumberForDate(appointments, todayStr) : 0;
    const appointmentNumber = `APT-2026-${String(appointments.length + 1).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...data,
      id: newId,
      appointmentNumber,
      tokenNumber,
      source: data.source || 'reception',
    };
    setAppointments((prev) => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointmentStatus = (
    id: string,
    status: AppointmentStatus,
    actingUser?: User | null
  ) => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (status === 'checked_in') {
      if (actor && !canCheckIn(actor, modules)) {
        console.error('Unauthorized: only receptionists can check in patients.');
        return;
      }
      const apt = appointments.find((a) => a.id === id);
      if (apt && apt.status !== 'checked_in') {
        const todayStr = formatLocalDate();
        const nextToken = apt.tokenNumber > 0 ? apt.tokenNumber : getNextTokenNumberForDate(appointments, todayStr);
        const checkedInApt: Appointment = {
          ...apt,
          status: 'checked_in',
          tokenNumber: nextToken,
          checkedInAt: apt.checkedInAt || new Date().toISOString(),
          checkedInBy: apt.checkedInBy || (actor ? { id: actor.id, name: actor.name } : null),
        };
        const checkinNotif: InAppNotification = {
          id: `notif-checkin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          recipientId: apt.doctorId,
          title: 'Patient Checked In',
          message: `Token #${nextToken}: ${apt.patientName} has checked in and is waiting in the lounge for ${formatDoctorName(apt.doctorName)}.`,
          type: 'checkin',
          read: false,
          createdAt: new Date().toISOString(),
          linkTab: 'doctor',
        };
        try {
          getRepository<InAppNotification>('notifications').create(checkinNotif).catch(() => {});
        } catch {
          // ignore
        }
        broadcastRealtimeEvent({
          type: 'PATIENT_CHECKED_IN',
          appointment: checkedInApt,
          notification: checkinNotif,
        });
      }
    }

    if (status === 'completed') {
      const apt = appointments.find((a) => a.id === id);
      if (apt && apt.status !== 'completed') {
        const doc = doctors.find((d) => d.id === apt.doctorId);
        const completedApt: Appointment = {
          ...apt,
          status: 'completed',
        };
        const completionNotif: InAppNotification = {
          id: `notif-complete-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          recipientId: 'reception',
          title: 'Consultation Completed',
          message: `${formatDoctorName(doc?.name || apt.doctorName)} has completed consultation for ${apt.patientName} (Token #${apt.tokenNumber || '-'}). Patient is ready for checkout and billing.`,
          type: 'completion',
          read: false,
          createdAt: new Date().toISOString(),
          linkTab: 'receptionist',
        };
        try {
          getRepository<InAppNotification>('notifications').create(completionNotif).catch(() => {});
        } catch {
          // ignore
        }
        broadcastRealtimeEvent({
          type: 'CONSULTATION_COMPLETED',
          appointment: completedApt,
          notification: completionNotif,
        });

        const repoInvoices = getRepository<any>('invoices');
        repoInvoices
          .list()
          .then((existingInvoices: any[]) => {
            const alreadyExists = existingInvoices.some(
              (inv) => inv.visitId === apt.id || inv.appointmentId === apt.id
            );
            if (!alreadyExists) {
              const newInvoice = buildInvoiceForVisit(apt, doc, existingInvoices, new Date());
              repoInvoices
                .create(newInvoice)
                .then(() => {
                  if (addAuditLogEntry) {
                    addAuditLogEntry({
                      action: 'invoice_issued',
                      targetUserId: apt.patientId,
                      targetStaffName: apt.patientName,
                      description: `Invoice ${newInvoice.number} issued for consultation visit of ${apt.patientName}`,
                      authorizedBy: doc?.name || 'Dr. Marcus Vance',
                    });
                  }
                  try {
                    window.dispatchEvent(
                      new StorageEvent('storage', {
                        key: `${STORAGE_KEY_PREFIX}invoices`,
                      })
                    );
                  } catch {
                    // ignore
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    if (addAuditLogEntry) {
      const targetApt = appointments.find((a) => a.id === id);
      if (status === 'in_consultation') {
        addAuditLogEntry({
          action: 'consultation_started',
          targetUserId: targetApt?.patientId,
          targetStaffName: targetApt?.patientName,
          description: `Consultation started for patient ${targetApt?.patientName || id}`,
          authorizedBy: actor?.name || 'Staff Doctor',
        });
      } else if (status === 'completed') {
        addAuditLogEntry({
          action: 'consultation_concluded',
          targetUserId: targetApt?.patientId,
          targetStaffName: targetApt?.patientName,
          description: `Consultation concluded for patient ${targetApt?.patientName || id}`,
          authorizedBy: actor?.name || 'Staff Doctor',
        });
      } else if (status === 'checked_in') {
        addAuditLogEntry({
          action: 'patient_checked_in',
          targetUserId: targetApt?.patientId,
          targetStaffName: targetApt?.patientName,
          description: `Patient ${targetApt?.patientName || id} checked in for appointment`,
          authorizedBy: actor?.name || 'Front Desk',
        });
      }
    }

    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id !== id) return apt;
        if (status === 'checked_in') {
          const todayStr = formatLocalDate();
          const nextToken = apt.tokenNumber > 0 ? apt.tokenNumber : getNextTokenNumberForDate(prev, todayStr);
          return {
            ...apt,
            status,
            tokenNumber: nextToken,
            checkedInAt: apt.checkedInAt || new Date().toISOString(),
            checkedInBy: apt.checkedInBy || (actor ? { id: actor.id, name: actor.name } : null),
          };
        }
        return { ...apt, status };
      })
    );
  };

  const updateAppointmentNotes = (id: string, notes: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, notes } : apt))
    );
  };

  const recordVitals = (data: Omit<VitalSigns, 'id' | 'recordedAt'>): VitalSigns => {
    const newId = `vit-${vitals.length + 1}`;
    const newVital: VitalSigns = {
      ...data,
      id: newId,
      recordedAt: new Date().toISOString(),
    };
    setVitals((prev) => [newVital, ...prev]);
    return newVital;
  };

  const saveVitals = (
    patientId: string,
    data: Partial<VitalSigns> & { recordedBy?: string; recordedByName?: string }
  ): VitalSigns => {
    let savedVital: VitalSigns;
    setVitals((prev) => {
      const existingIndex = prev.findIndex((v) => v.patientId === patientId);
      if (existingIndex >= 0) {
        savedVital = {
          ...prev[existingIndex],
          ...data,
          recordedAt: new Date().toISOString(),
        };
        const updated = [...prev];
        updated[existingIndex] = savedVital;
        return updated;
      } else {
        savedVital = {
          id: `vit-${prev.length + 1}`,
          patientId,
          recordedBy: data.recordedBy || 'usr-1',
          recordedByName: data.recordedByName || 'Dr. Marcus Vance',
          recordedAt: new Date().toISOString(),
          systolicBp: data.systolicBp ?? 120,
          diastolicBp: data.diastolicBp ?? 80,
          heartRateBpm: data.heartRateBpm ?? 72,
          temperatureCelsius: data.temperatureCelsius ?? 37.0,
          respiratoryRate: data.respiratoryRate ?? 16,
          oxygenSaturationPct: data.oxygenSaturationPct ?? 98,
          weightKg: data.weightKg ?? 70,
          heightCm: data.heightCm ?? 170,
          bmi: data.bmi ?? 24.2,
          ...data,
        };
        return [savedVital, ...prev];
      }
    });
    if (addAuditLogEntry && savedVital!) {
      addAuditLogEntry({
        action: 'vitals_recorded',
        targetUserId: patientId,
        description: `Triage vitals recorded for patient ${patientId} (BP: ${savedVital.systolicBp}/${savedVital.diastolicBp}, HR: ${savedVital.heartRateBpm}, Temp: ${savedVital.temperatureCelsius}C, SpO2: ${savedVital.oxygenSaturationPct}%)`,
        authorizedBy: data.recordedByName || authUser?.name || 'Staff Doctor',
      });
    }
    return savedVital!;
  };

  const createPrescription = (
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>,
    actingUser?: User | null
  ): { success: boolean; prescription?: Prescription; error?: string } => {
    const actor = actingUser || authUser;
    if (!actor) {
      return { success: false, error: 'Authentication required to issue prescriptions.' };
    }

    if (!canPrescribe(actor, data.patientId, patientAssignments, modules, data.doctorId)) {
      return {
        success: false,
        error: 'Only the assigned physician with Prescription Authoring and EMR Records Access can issue prescriptions.',
      };
    }

    const val = validatePrescription({
      diagnosis: data.diagnosis,
      items: data.items,
      patientId: data.patientId,
      doctorId: data.doctorId,
    });
    if (!val.valid) {
      return { success: false, error: val.errors.join(' ') };
    }

    const newId = `rx-${prescriptions.length + 1}`;
    const prescriptionNumber = `RX-2026-${String(prescriptions.length + 85).padStart(4, '0')}`;
    const newRx: Prescription = {
      ...data,
      id: newId,
      prescriptionNumber,
      date: formatLocalDate(),
      status: 'active',
    };

    setPrescriptions((prev) => [newRx, ...prev]);

    // Log to security audit ledger
    addAuditLogEntry({
      action: 'prescription_issued',
      targetRole: 'patient',
      targetUserId: data.patientId,
      targetStaffName: data.patientName,
      description: `e-Prescription #${prescriptionNumber} issued by Dr. ${data.doctorName} for ${data.patientName}. Diagnosis: ${data.diagnosis}.`,
      authorizedBy: actor.name,
    });

    if (data.allergyOverrides && data.allergyOverrides.length > 0) {
      data.allergyOverrides.forEach((override) => {
        addAuditLogEntry({
          action: 'allergy_override',
          targetRole: 'patient',
          targetUserId: data.patientId,
          targetStaffName: data.patientName,
          description: `Allergy warning overridden for ${override.allergen} when prescribing ${override.medicine}. Reason: ${override.reason}`,
          authorizedBy: actor.name,
        });
      });
    }

    return { success: true, prescription: newRx };
  };

  const cancelPrescription = async (
    prescriptionId: string,
    reason: string,
    actingUser?: User | null
  ): Promise<{ success: boolean; error?: string }> => {
    const actor = actingUser || authUser;
    if (!actor) {
      return { success: false, error: 'Authentication required.' };
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { success: false, error: 'A cancellation reason is required.' };
    }

    const targetRx = prescriptions.find((rx) => rx.id === prescriptionId);
    if (!targetRx) {
      return { success: false, error: 'Prescription not found.' };
    }

    if (targetRx.status === 'cancelled') {
      return { success: false, error: 'Prescription is already cancelled.' };
    }

    if (!canCancelPrescription(actor, targetRx, modules)) {
      return {
        success: false,
        error: 'Only the original issuing doctor or an administrator can cancel a prescription.',
      };
    }

    const nowIso = new Date().toISOString();
    const updatedRx: Prescription = {
      ...targetRx,
      status: 'cancelled',
      cancelledBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
      },
      cancelledAt: nowIso,
      cancelReason: cleanReason,
    };

    setPrescriptions((prev) =>
      prev.map((r) => (r.id === prescriptionId ? updatedRx : r))
    );

    addAuditLogEntry({
      action: 'prescription_cancelled',
      targetRole: 'patient',
      targetUserId: targetRx.patientId,
      targetStaffName: targetRx.patientName,
      description: `Prescription #${targetRx.prescriptionNumber} cancelled by ${actor.name}. Reason: ${cleanReason}`,
      authorizedBy: actor.name,
    });

    return { success: true };
  };

  const addMedicine = async (
    medicineData: Omit<Medicine, 'id'>,
    actingUser?: User | null
  ): Promise<{ success: boolean; medicine?: Medicine; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const cleanName = medicineData.genericName.trim();
    if (!cleanName) {
      return { success: false, error: 'Generic name is required.' };
    }

    const nameExists = medicines.some(
      (m) => m.genericName.toLowerCase() === cleanName.toLowerCase()
    );
    if (nameExists) {
      return { success: false, error: `A medicine named "${cleanName}" already exists in the formulary.` };
    }

    const newMed: Medicine = {
      ...medicineData,
      id: `med-${Date.now()}`,
      genericName: cleanName,
    };

    setMedicines((prev) => [newMed, ...prev]);

    addAuditLogEntry({
      action: 'formulary_medicine_created',
      targetRole: 'admin',
      description: `Formulary medicine added: ${cleanName} (${medicineData.drugClass}, ${medicineData.form}).`,
      authorizedBy: actor?.name,
    });

    return { success: true, medicine: newMed };
  };

  const updateMedicine = async (
    id: string,
    updates: Partial<Medicine>,
    actingUser?: User | null
  ): Promise<{ success: boolean; medicine?: Medicine; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const target = medicines.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Medicine not found.' };
    }

    if (updates.genericName) {
      const cleanName = updates.genericName.trim();
      const duplicate = medicines.some(
        (m) => m.id !== id && m.genericName.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `A medicine named "${cleanName}" already exists in the formulary.` };
      }
    }

    const updatedMed: Medicine = {
      ...target,
      ...updates,
      genericName: updates.genericName ? updates.genericName.trim() : target.genericName,
    };

    setMedicines((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));

    addAuditLogEntry({
      action: 'formulary_medicine_updated',
      targetRole: 'admin',
      description: `Formulary medicine updated: ${updatedMed.genericName}.`,
      authorizedBy: actor?.name,
    });

    return { success: true, medicine: updatedMed };
  };

  const toggleMedicineStatus = async (
    id: string,
    actingUser?: User | null
  ): Promise<{ success: boolean; active?: boolean; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const target = medicines.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Medicine not found.' };
    }

    const nextActive = !target.active;
    const updatedMed = { ...target, active: nextActive };

    setMedicines((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));

    addAuditLogEntry({
      action: 'formulary_medicine_status_changed',
      targetRole: 'admin',
      description: `Formulary medicine ${target.genericName} marked ${nextActive ? 'Active' : 'Inactive'}.`,
      authorizedBy: actor?.name,
    });

    return { success: true, active: nextActive };
  };

  const dispensePrescriptionItem = (
    prescriptionId: string,
    itemId: string,
    pharmacistName: string
  ) => {
    setPrescriptions((prev) =>
      prev.map((rx) => {
        if (rx.id !== prescriptionId) return rx;
        const updatedItems = rx.items.map((it) =>
          it.id === itemId ? { ...it, dispensed: true } : it
        );
        const allDispensed = updatedItems.every((it) => it.dispensed);
        return {
          ...rx,
          items: updatedItems,
          status: allDispensed ? 'dispensed' : 'partially_dispensed',
          dispensedBy: pharmacistName,
          dispensedAt: new Date().toISOString(),
        };
      })
    );
  };

  const createLabTest = (
    data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>
  ): LabTest => {
    const newId = `lab-${labTests.length + 1}`;
    const testOrderNumber = `LAB-2026-${String(labTests.length + 125).padStart(4, '0')}`;
    const newTest: LabTest = {
      ...data,
      id: newId,
      testOrderNumber,
      orderedAt: new Date().toISOString(),
      status: 'ordered',
    };
    setLabTests((prev) => [newTest, ...prev]);
    return newTest;
  };

  const updateLabTestStatus = (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => {
    setLabTests((prev) =>
      prev.map((test) => {
        if (test.id !== id) return test;
        return {
          ...test,
          status,
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          ...(status === 'sample_collected'
            ? { sampleCollectedAt: new Date().toISOString() }
            : {}),
          ...(extra?.result ? { result: extra.result } : {}),
          ...(extra?.notes ? { clinicalNotes: extra.notes } : {}),
          ...(extra?.technicianName ? { technicianName: extra.technicianName } : {}),
        };
      })
    );
  };

  const createInvoice = (
    data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>
  ): Invoice => {
    const newId = `inv-${invoices.length + 1}`;
    const invoiceNumber = `INV-2026-${String(invoices.length + 500).padStart(4, '0')}`;
    const newInv: Invoice = {
      ...data,
      id: newId,
      invoiceNumber,
      date: formatLocalDate(),
      status: data.paidAmount >= data.totalAmount ? 'paid' : data.paidAmount > 0 ? 'partially_paid' : 'unpaid',
    };
    setInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const recordPayment = (id: string, amount: number, method: PaymentMethod) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const newPaid = inv.paidAmount + amount;
        const newStatus =
          newPaid >= inv.totalAmount
            ? 'paid'
            : newPaid > 0
            ? 'partially_paid'
            : 'unpaid';
        return {
          ...inv,
          paidAmount: newPaid,
          status: newStatus,
          paymentMethod: method,
        };
      })
    );
  };

  const createModule = (
    name: string,
    description?: string,
    initialAccessIds?: StandardCapability[],
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can create modules.' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Role name is required.' };
    }
    if (modules.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: 'A role with this name already exists.' };
    }

    const accessIds = initialAccessIds ? Array.from(new Set(initialAccessIds)) : [];
    if (accessIds.includes('prescriptionAuthoring') && !accessIds.includes('emrRecordsAccess')) {
      return {
        success: false,
        error: 'Prescription Authoring requires EMR Records Access to be included as well.',
      };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newModule: AccessModule = {
      id: `mod-${Date.now()}`,
      name: trimmedName,
      description: description?.trim() || '',
      accessIds,
      memberIds: [],
      isSystem: false,
      createdBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
      createdAt: timestamp,
    };

    setModules((prev) => [...prev, newModule]);

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: trimmedName,
      action: 'module_created',
      description: `Role '${trimmedName}' created with ${accessIds.length} access(es) by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true, module: newModule };
  };

  const renameModule = (
    id: string,
    name: string,
    description?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can modify modules.' };
    }
    const target = modules.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Module name is required.' };
    }
    if (
      modules.some(
        (m) => m.id !== id && m.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      return { success: false, error: 'A module with this name already exists.' };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: trimmedName,
              description: description !== undefined ? description.trim() : m.description,
            }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: trimmedName,
      action: 'module_renamed',
      description: `Module '${target.name}' renamed to '${trimmedName}' by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const deleteModule = (
    id: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canDeleteModule(actor, target, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) => prev.filter((m) => m.id !== id));

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: target.name,
      action: 'module_deleted',
      description: `Module '${target.name}' deleted by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const includeAccess = (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canIncludeAccess(actor, target, accessId, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, accessIds: Array.from(new Set([...m.accessIds, accessId])) }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: target.name,
      capability: accessId,
      action: 'module_access_included',
      description: `Access '${accessId}' included in module '${target.name}' by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const removeAccess = (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canRemoveAccess(actor, target, accessId, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, accessIds: m.accessIds.filter((a) => a !== accessId) }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: target.name,
      capability: accessId,
      action: 'module_access_removed',
      description: `Access '${accessId}' removed from module '${target.name}' by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const addMember = (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const staffMember = staffAccessList.find(
      (s) => s.id === staffId || s.badgeNumber === staffId || s.staffName === staffId
    );
    const check = canAddMember(
      actor,
      target,
      staffMember || ({ id: staffId } as any),
      reason,
      modules
    );
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, memberIds: Array.from(new Set([...m.memberIds, staffId])) }
          : m
      )
    );

    const staffDisplayName = staffMember?.staffName || staffId;
    const isAdministration =
      target.id === 'mod-admin' || target.accessIds.includes('administrativeAccess');
    const reasonText =
      isAdministration && reason
        ? ` (Reason: ${reason})`
        : reason
        ? ` (${reason})`
        : '';

    addAuditLogEntry({
      targetRole: staffMember?.role || 'doctor',
      targetStaffName: staffDisplayName,
      targetUserId: staffId,
      action: 'module_member_added',
      description: `Staff member '${staffDisplayName}' added to module '${target.name}' by ${actor?.name || 'Clinic Administrator'}${reasonText}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const removeMember = (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const staffMember = staffAccessList.find(
      (s) => s.id === staffId || s.badgeNumber === staffId || s.staffName === staffId
    );
    const check = canRemoveMember(
      actor,
      target,
      staffMember || ({ id: staffId } as any),
      modules,
      staffAccessList
    );
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              memberIds: m.memberIds.filter(
                (mid) => mid !== staffId && mid !== staffMember?.id
              ),
            }
          : m
      )
    );

    const staffDisplayName = staffMember?.staffName || staffId;
    const isAdministration =
      target.id === 'mod-admin' || target.accessIds.includes('administrativeAccess');
    const reasonText =
      isAdministration && reason
        ? ` (Reason: ${reason})`
        : reason
        ? ` (${reason})`
        : '';

    addAuditLogEntry({
      targetRole: staffMember?.role || 'doctor',
      targetStaffName: staffDisplayName,
      targetUserId: staffId,
      action: 'module_member_removed',
      description: `Staff member '${staffDisplayName}' removed from module '${target.name}' by ${actor?.name || 'Clinic Administrator'}${reasonText}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true };
  };

  const createAccess = (
    label: string,
    description: string,
    actingUser?: User | null
  ): { success: boolean; error?: string; accessItem?: AccessItem } => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can create new access privileges.' };
    }
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false, error: 'Access privilege name is required.' };
    }
    if (accessCatalog.some((a) => a.label.toLowerCase() === trimmedLabel.toLowerCase())) {
      return { success: false, error: 'An access privilege with this name already exists.' };
    }

    const slug = trimmedLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = `acc_${slug || Date.now()}`;

    const newAccess: AccessItem = {
      id: id as StandardCapability,
      label: trimmedLabel,
      description: description.trim() || 'Custom operational access privilege.',
    };

    registerCustomAccess(newAccess);

    setCustomAccesses((prev) => {
      const next = [...prev, newAccess];
      try {
        sessionStorage.setItem('cms_custom_accesses_v1', JSON.stringify(next));
      } catch {
        // fallback
      }
      return next;
    });

    addAuditLogEntry({
      targetRole: 'admin',
      targetStaffName: trimmedLabel,
      action: 'module_created',
      description: `Access privilege '${trimmedLabel}' created by ${actor?.name || 'Clinic Administrator'}`,
      authorizedBy: actor?.name || 'Meera Krishnan (Clinic Administrator)',
    });

    return { success: true, accessItem: newAccess };
  };

  return (
    <ClinicContext.Provider
      value={{
        clinics,
        currentClinic,
        activeClinicId,
        switchClinic,
        createClinic,
        organizations,
        currentOrganization,
        isFacilityEnabled,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        appointOrganizationAdmin,
        linkClinicToOrganization,
        patients,
        doctors,
        appointments,
        vitals,
        prescriptions,
        labTests,
        invoices,
        patientAssignments,
        modules,
        accessCatalog,
        createAccess,
        transferPatient,
        addPatient,
        registerPatient,
        checkInAppointment,
        checkInWalkIn,
        bookAppointment,
        cancelAppointmentAction,
        rescheduleAppointmentAction,
        updateAppointment,
        updatePatient,
        addDoctor,
        updateDoctorStatus,
        addAppointment,
        updateAppointmentStatus,
        updateAppointmentNotes,
        recordVitals,
        saveVitals,
        medicines,
        visits,
        addVisit,
        createPrescription,
        cancelPrescription,
        dispensePrescriptionItem,
        addMedicine,
        updateMedicine,
        toggleMedicineStatus,
        createLabTest,
        updateLabTestStatus,
        createInvoice,
        recordPayment,
        createModule,
        renameModule,
        deleteModule,
        includeAccess,
        removeAccess,
        addMember,
        removeMember,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

