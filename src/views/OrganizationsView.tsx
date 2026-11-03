import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Building2,
  ShieldCheck,
  Layers,
  Plus,
  Edit3,
  Trash2,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Hospital,
  Check,
  Search,
  Shield,
  FileCheck,
} from 'lucide-react';
import { Organization, LicenseTier, FacilityModule } from '@/types';

interface OrganizationsViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
}

const ALL_FACILITIES: { id: FacilityModule; label: string; description: string }[] = [
  { id: 'OPD', label: 'OPD (Outpatient)', description: 'Outpatient consultations, doctor schedules, walk-in tokens' },
  { id: 'IPD', label: 'IPD (Inpatient)', description: 'Ward management, admissions, bed allocation, discharge summaries' },
  { id: 'Pharmacy', label: 'Pharmacy & Formulary', description: 'Drug formulary, prescription dispensing, stock tracking' },
  { id: 'Laboratory', label: 'Laboratory Diagnostics', description: 'Diagnostic test orders, specimen tracking, pathology results' },
  { id: 'Emergency', label: 'Emergency & Trauma', description: 'Triage queue, rapid intake, crash cart and critical stabilization' },
  { id: 'Billing', label: 'Billing & Invoicing', description: 'Fee schedules, split invoices, receipts, payment reconciliation' },
];

const LICENSE_TIER_DETAILS: Record<
  LicenseTier,
  { label: string; badgeClass: string; maxBranchesDefault: number; maxDoctorsDefault: number }
> = {
  starter: {
    label: 'Starter Tier',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    maxBranchesDefault: 2,
    maxDoctorsDefault: 10,
  },
  professional: {
    label: 'Professional Tier',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    maxBranchesDefault: 5,
    maxDoctorsDefault: 30,
  },
  enterprise: {
    label: 'Enterprise Tier',
    badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    maxBranchesDefault: 10,
    maxDoctorsDefault: 100,
  },
  custom: {
    label: 'Custom Tier',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    maxBranchesDefault: 25,
    maxDoctorsDefault: 250,
  },
};

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({ onNavigate }) => {
  const {
    organizations,
    clinics,
    doctors,
    activeClinicId,
    switchClinic,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    appointOrganizationAdmin,
    linkClinicToOrganization,
  } = useClinic();
  const { staffAccessList } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({ 'ORG-001': true });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [appointingOrg, setAppointingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [attachingOrg, setAttachingOrg] = useState<Organization | null>(null);

  // Form states for Create Organization
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');
  const [newOrgState, setNewOrgState] = useState('');
  const [newOrgCountry, setNewOrgCountry] = useState('India');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [newOrgLicenseTier, setNewOrgLicenseTier] = useState<LicenseTier>('enterprise');
  const [newOrgLicenseNumber, setNewOrgLicenseNumber] = useState('');
  const [newOrgValidUntil, setNewOrgValidUntil] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [newOrgMaxBranches, setNewOrgMaxBranches] = useState(5);
  const [newOrgMaxDoctors, setNewOrgMaxDoctors] = useState(50);
  const [newOrgFacilities, setNewOrgFacilities] = useState<FacilityModule[]>([
    'OPD',
    'IPD',
    'Pharmacy',
    'Laboratory',
    'Emergency',
    'Billing',
  ]);
  const [newOrgAdminName, setNewOrgAdminName] = useState('');
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states for Edit Organization & Licensing
  const [editTier, setEditTier] = useState<LicenseTier>('enterprise');
  const [editLicenseNum, setEditLicenseNum] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editMaxBranches, setEditMaxBranches] = useState(5);
  const [editMaxDoctors, setEditMaxDoctors] = useState(50);
  const [editFacilities, setEditFacilities] = useState<FacilityModule[]>([]);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'trial' | 'inactive'>('active');

  // Form states for Appoint Admin
  const [appointedName, setAppointedName] = useState('');
  const [appointedEmail, setAppointedEmail] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Form states for Delete Confirmation
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');

  // Form states for Attach Branch
  const [selectedClinicToAttach, setSelectedClinicToAttach] = useState('');

  // Auto-generate code when org name changes in create form
  const handleNameChange = (val: string) => {
    setNewOrgName(val);
    const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (!newOrgCode || newOrgCode === newOrgName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)) {
      setNewOrgCode(code);
      setNewOrgLicenseNumber(`MED-LIC-${code}-${new Date().getFullYear()}`);
    }
  };

  const handleTierChange = (tier: LicenseTier) => {
    setNewOrgLicenseTier(tier);
    const defaults = LICENSE_TIER_DETAILS[tier];
    setNewOrgMaxBranches(defaults.maxBranchesDefault);
    setNewOrgMaxDoctors(defaults.maxDoctorsDefault);
  };

  const toggleFacility = (list: FacilityModule[], setList: (val: FacilityModule[]) => void, fac: FacilityModule) => {
    if (list.includes(fac)) {
      setList(list.filter((f) => f !== fac));
    } else {
      setList([...list, fac]);
    }
  };

  // Filter organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.city && org.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (org.licenseNumber && org.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        org.licenseStatus === statusFilter ||
        org.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, statusFilter]);

  // Overall metrics calculation
  const totalBranchesCount = useMemo(() => {
    return clinics.length;
  }, [clinics]);

  const totalDoctorsCount = useMemo(() => {
    return doctors.length;
  }, [doctors]);

  // Helper for license badge styling and expiry info
  const getLicenseInfo = (org: Organization) => {
    const validDate = new Date(org.licenseValidUntil);
    const now = new Date();
    const diffTime = validDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Expired',
        badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
        remainingText: `Expired ${Math.abs(diffDays)} days ago`,
        isCritical: true,
      };
    }
    if (diffDays <= 30) {
      return {
        label: 'Expiring Soon',
        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
        remainingText: `${diffDays} days remaining`,
        isCritical: true,
      };
    }
    return {
      label: 'Active & Compliant',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
      remainingText: `${diffDays} days remaining`,
      isCritical: false,
    };
  };

  // Open Create Modal
  const openCreateModal = () => {
    setNewOrgName('');
    setNewOrgCode('');
    setNewOrgAddress('');
    setNewOrgCity('');
    setNewOrgState('');
    setNewOrgCountry('India');
    setNewOrgPhone('');
    setNewOrgEmail('');
    setNewOrgWebsite('');
    setNewOrgLicenseTier('enterprise');
    setNewOrgLicenseNumber('');
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setNewOrgValidUntil(nextYear.toISOString().split('T')[0]);
    setNewOrgMaxBranches(5);
    setNewOrgMaxDoctors(50);
    setNewOrgFacilities(['OPD', 'IPD', 'Pharmacy', 'Laboratory', 'Emergency', 'Billing']);
    setNewOrgAdminName('');
    setNewOrgAdminEmail('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Submit Create Organization
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setFormError('Organization name is required.');
      return;
    }
    if (!newOrgCode.trim()) {
      setFormError('Organization code is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createOrganization({
        name: newOrgName.trim(),
        code: newOrgCode.trim().toUpperCase(),
        headquartersAddress: newOrgAddress.trim(),
        city: newOrgCity.trim(),
        state: newOrgState.trim(),
        country: newOrgCountry.trim(),
        phone: newOrgPhone.trim(),
        email: newOrgEmail.trim(),
        website: newOrgWebsite.trim(),
        licenseTier: newOrgLicenseTier,
        licenseNumber: newOrgLicenseNumber.trim() || `MED-LIC-${newOrgCode.toUpperCase()}-${new Date().getFullYear()}`,
        licenseValidUntil: new Date(newOrgValidUntil).toISOString(),
        licenseStatus: 'active',
        maxBranches: Number(newOrgMaxBranches) || 5,
        maxDoctors: Number(newOrgMaxDoctors) || 50,
        facilities: newOrgFacilities,
        appointedAdminName: newOrgAdminName.trim() || undefined,
        appointedAdminEmail: newOrgAdminEmail.trim() || undefined,
        status: 'active',
      });

      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setEditTier(org.licenseTier || 'enterprise');
    setEditLicenseNum(org.licenseNumber || '');
    setEditValidUntil(org.licenseValidUntil ? org.licenseValidUntil.split('T')[0] : '');
    setEditMaxBranches(org.maxBranches ?? 5);
    setEditMaxDoctors(org.maxDoctors ?? 50);
    setEditFacilities(org.facilities || []);
    setEditStatus(org.status || 'active');
  };

  // Submit Edit Organization
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setIsSubmitting(true);
    try {
      await updateOrganization(editingOrg.id, {
        licenseTier: editTier,
        licenseNumber: editLicenseNum.trim(),
        licenseValidUntil: editValidUntil ? new Date(editValidUntil).toISOString() : editingOrg.licenseValidUntil,
        maxBranches: Number(editMaxBranches),
        maxDoctors: Number(editMaxDoctors),
        facilities: editFacilities,
        status: editStatus,
      });
      setEditingOrg(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Appoint Admin Modal
  const openAppointModal = (org: Organization) => {
    setAppointingOrg(org);
    setAppointedName(org.appointedAdminName || '');
    setAppointedEmail(org.appointedAdminEmail || '');
    setSelectedStaffId(org.appointedAdminId || '');
  };

  // Handle staff selection in Appoint Admin
  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const found = staffAccessList.find((s) => s.id === staffId);
    if (found) {
      setAppointedName(found.staffName);
      setAppointedEmail(`${found.staffName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@subiksham.local`);
    }
  };

  // Submit Appoint Admin
  const handleAppointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointingOrg) return;
    if (!appointedName.trim()) {
      setFormError('Administrator full name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await appointOrganizationAdmin(
        appointingOrg.id,
        selectedStaffId || `acc-adm-${Date.now().toString(36)}`,
        appointedName.trim(),
        appointedEmail.trim()
      );
      setAppointingOrg(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to appoint administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (org: Organization) => {
    setDeletingOrg(org);
    setDeleteConfirmationCode('');
    setFormError('');
  };

  // Submit Delete Organization
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingOrg) return;

    if (deleteConfirmationCode.trim().toUpperCase() !== deletingOrg.code.toUpperCase()) {
      setFormError(`Please type ${deletingOrg.code} exactly to confirm deletion.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deleteOrganization(deletingOrg.id);
      if (res.success) {
        setDeletingOrg(null);
      } else {
        setFormError(res.error || 'Failed to delete organization.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Attach Branch Modal
  const openAttachBranchModal = (org: Organization) => {
    setAttachingOrg(org);
    setSelectedClinicToAttach('');
  };

  // Submit Attach Branch
  const handleAttachBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachingOrg || !selectedClinicToAttach) return;

    setIsSubmitting(true);
    try {
      await linkClinicToOrganization(selectedClinicToAttach, attachingOrg.id);
      setAttachingOrg(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to attach branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch clinic branch
  const handleSwitchToBranch = async (clinicId: string) => {
    await switchClinic(clinicId);
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Platform Super Admin Control Plane</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Enterprise Organizations & Healthcare Networks
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Multi-branch institutional governance, enterprise software licensing, facility module authorization,
            and appointed hospital administrator oversight.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-900/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Organizations
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {organizations.length}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active Enterprise Tenants
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Operating Branches
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalBranchesCount}
              </p>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                <Hospital className="w-3 h-3" />
                Hospital & Clinic Branches
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Hospital className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Enrolled Doctors
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalDoctorsCount}
              </p>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Licensed Clinical Providers
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Licensing Status
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                100%
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Valid & Compliant
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by organization name, code, license, city..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All License Statuses</option>
            <option value="active">Active & Compliant</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="space-y-6">
        {filteredOrganizations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No organizations found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No enterprise organizations match your search or filter criteria. Create a new organization to get started.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Create New Organization
            </Button>
          </div>
        ) : (
          filteredOrganizations.map((org) => {
            const licenseInfo = getLicenseInfo(org);
            const tierConfig = LICENSE_TIER_DETAILS[org.licenseTier] || LICENSE_TIER_DETAILS.enterprise;
            const orgClinics = clinics.filter((c) => c.organizationId === org.id);
            const isExpanded = expandedBranches[org.id] ?? true;

            const branchUsagePct = Math.min(100, Math.round((orgClinics.length / (org.maxBranches || 1)) * 100));
            const doctorUsagePct = Math.min(100, Math.round((totalDoctorsCount / (org.maxDoctors || 1)) * 100));

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Organization Card Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                      {org.code.slice(0, 2)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {org.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {org.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tierConfig.badgeClass}`}>
                          {tierConfig.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${licenseInfo.badge}`}>
                          {licenseInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                        {org.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {org.city}, {org.state || org.country}
                          </span>
                        )}
                        {org.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {org.phone}
                          </span>
                        )}
                        {org.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {org.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAppointModal(org)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Appoint Admin</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(org)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Licensing & Modules</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openDeleteModal(org)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>

                {/* Organization Details Grid */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Software Licensing & Capacity */}
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-purple-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Licensing & Capacity
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                        {org.licenseNumber}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-400">Branch Quota:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {orgClinics.length} / {org.maxBranches} branches ({branchUsagePct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              branchUsagePct >= 100
                                ? 'bg-rose-500'
                                : branchUsagePct >= 80
                                ? 'bg-amber-500'
                                : 'bg-purple-600'
                            }`}
                            style={{ width: `${branchUsagePct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-400">Doctor Capacity:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {totalDoctorsCount} / {org.maxDoctors} doctors ({doctorUsagePct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              doctorUsagePct >= 100
                                ? 'bg-rose-500'
                                : doctorUsagePct >= 80
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${doctorUsagePct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Valid Until:</span>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {org.licenseValidUntil ? new Date(org.licenseValidUntil).toLocaleDateString() : 'Lifetime'}
                          </p>
                          <p className={`text-[11px] font-medium ${licenseInfo.isCritical ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {licenseInfo.remainingText}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Appointed Administrator */}
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Appointed Administrator
                        </h4>
                      </div>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        Primary Contact
                      </span>
                    </div>

                    {org.appointedAdminName ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/20">
                            {org.appointedAdminName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {org.appointedAdminName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {org.appointedAdminEmail || 'No email configured'}
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Appointed as institutional authority for {org.name}</span>
                        </div>

                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openAppointModal(org)}
                          className="w-full text-xs"
                        >
                          Reappoint / Change Admin
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No primary administrator appointed yet.
                        </p>
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => openAppointModal(org)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Appoint Administrator
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Facility Modules */}
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Facility Modules
                        </h4>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {org.facilities?.length || 0} Enabled
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {ALL_FACILITIES.map((facility) => {
                        const isEnabled = org.facilities?.includes(facility.id);
                        return (
                          <div
                            key={facility.id}
                            title={facility.description}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                              isEnabled
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'bg-slate-100/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
                            }`}
                          >
                            <span>{facility.id}</span>
                            {isEnabled ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <span className="text-[10px] uppercase font-mono">Off</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      Modules determine the authorized hospital wings and departments accessible to branches.
                    </p>
                  </div>
                </div>

                {/* Operating Branches Drawer */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/20 dark:bg-slate-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() =>
                        setExpandedBranches((prev) => ({ ...prev, [org.id]: !isExpanded }))
                      }
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors"
                    >
                      <Hospital className="w-4 h-4 text-blue-500" />
                      <span>Operating Branches ({orgClinics.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openAttachBranchModal(org)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Attach Branch</span>
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 mt-3">
                      {orgClinics.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                          No hospital branches attached to this organization yet. Click &quot;Attach Branch&quot; to link a clinic.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {orgClinics.map((clinic) => {
                            const isCurrent = clinic.id === activeClinicId;
                            return (
                              <div
                                key={clinic.id}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isCurrent
                                    ? 'bg-purple-500/5 border-purple-500/40 ring-1 ring-purple-500/30'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {clinic.name}
                                      </h5>
                                      {isCurrent && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                      {clinic.code} • {clinic.city || 'Headquarters'}
                                    </span>
                                  </div>

                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 mt-2">
                                  <button
                                    onClick={() => handleSwitchToBranch(clinic.id)}
                                    disabled={isCurrent}
                                    className={`text-xs font-semibold flex items-center gap-1 ${
                                      isCurrent
                                        ? 'text-slate-400 cursor-default'
                                        : 'text-purple-600 dark:text-purple-400 hover:underline'
                                    }`}
                                  >
                                    <span>{isCurrent ? 'Active Context' : 'Switch Branch'}</span>
                                    {!isCurrent && <ExternalLink className="w-3 h-3" />}
                                  </button>

                                  <button
                                    onClick={() => linkClinicToOrganization(clinic.id, null)}
                                    className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    Unlink
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create Organization */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Enterprise Organization"
          description="Provision a new healthcare parent enterprise with licensing tier, facility authorization, and initial governance."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? 'Provisioning...' : 'Provision Organization'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Hospitals Group"
                  value={newOrgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APOLLO"
                  value={newOrgCode}
                  onChange={(e) => setNewOrgCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={newOrgCity}
                  onChange={(e) => setNewOrgCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={newOrgState}
                  onChange={(e) => setNewOrgState(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 90000 00000"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Licensing Tier & Quotas */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Enterprise Licensing & Quotas</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    License Tier
                  </label>
                  <select
                    value={newOrgLicenseTier}
                    onChange={(e) => handleTierChange(e.target.value as LicenseTier)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="starter">Starter (Up to 2 branches, 10 doctors)</option>
                    <option value="professional">Professional (Up to 5 branches, 30 doctors)</option>
                    <option value="enterprise">Enterprise (Up to 10 branches, 100 doctors)</option>
                    <option value="custom">Custom High-Volume (Up to 25 branches, 250 doctors)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    License Certificate #
                  </label>
                  <input
                    type="text"
                    placeholder="MED-LIC-..."
                    value={newOrgLicenseNumber}
                    onChange={(e) => setNewOrgLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Valid Until (Expiry)
                  </label>
                  <input
                    type="date"
                    value={newOrgValidUntil}
                    onChange={(e) => setNewOrgValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Branch Quota
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newOrgMaxBranches}
                    onChange={(e) => setNewOrgMaxBranches(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Doctor Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={newOrgMaxDoctors}
                    onChange={(e) => setNewOrgMaxDoctors(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Facility Modules Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Authorized Facility Modules
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_FACILITIES.map((facility) => {
                  const isChecked = newOrgFacilities.includes(facility.id);
                  return (
                    <label
                      key={facility.id}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                        isChecked
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFacility(newOrgFacilities, setNewOrgFacilities, facility.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span>{facility.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Initial Appointed Administrator */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>Initial Appointed Administrator (Optional)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={newOrgAdminName}
                    onChange={(e) => setNewOrgAdminName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh.sharma@hospital.org"
                    value={newOrgAdminEmail}
                    onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Edit Licensing & Facilities */}
      {editingOrg && (
        <Modal
          isOpen={true}
          onClose={() => setEditingOrg(null)}
          title={`Edit Licensing: ${editingOrg.name}`}
          description="Update enterprise subscription terms, capacity allocations, and authorized clinical wings."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingOrg(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEditSubmit}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  License Tier
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value as LicenseTier)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="starter">Starter Tier</option>
                  <option value="professional">Professional Tier</option>
                  <option value="enterprise">Enterprise Tier</option>
                  <option value="custom">Custom Tier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  License Certificate #
                </label>
                <input
                  type="text"
                  value={editLicenseNum}
                  onChange={(e) => setEditLicenseNum(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Branches
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editMaxBranches}
                  onChange={(e) => setEditMaxBranches(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Doctors
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={editMaxDoctors}
                  onChange={(e) => setEditMaxDoctors(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Toggle Authorized Facilities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_FACILITIES.map((facility) => {
                  const isChecked = editFacilities.includes(facility.id);
                  return (
                    <label
                      key={facility.id}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                        isChecked
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFacility(editFacilities, setEditFacilities, facility.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span>{facility.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Appoint Administrator */}
      {appointingOrg && (
        <Modal
          isOpen={true}
          onClose={() => setAppointingOrg(null)}
          title={`Appoint Administrator: ${appointingOrg.name}`}
          description="Designate a primary executive administrator responsible for hospital operations and staff authority."
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppointingOrg(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAppointSubmit}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAppointSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select from Platform Staff Directory
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              >
                <option value="">-- Or enter custom administrator below --</option>
                {staffAccessList
                  .filter((s) => s.role === 'admin' || s.role === 'md')
                  .map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.staffName} ({staff.staffTitle} • {staff.department})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrator Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Meera Krishnan"
                value={appointedName}
                onChange={(e) => setAppointedName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrator Email Address
              </label>
              <input
                type="email"
                placeholder="admin@hospital.local"
                value={appointedEmail}
                onChange={(e) => setAppointedEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Delete Organization Confirmation */}
      {deletingOrg && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingOrg(null)}
          title={`Delete Organization: ${deletingOrg.name}`}
          description="Are you sure you want to permanently delete this enterprise organization? This operation cannot be undone."
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingOrg(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting || deleteConfirmationCode.trim().toUpperCase() !== deletingOrg.code.toUpperCase()}
              >
                {isSubmitting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Operating Branches Safety Notice</span>
              </p>
              <p>
                Any hospital branches attached to this organization will be safely detached as independent standalone
                clinics. Their patient records, medical charts, and billing entries will remain intact.
              </p>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type <span className="font-mono text-rose-600 font-bold">{deletingOrg.code}</span> to confirm:
              </label>
              <input
                type="text"
                placeholder={deletingOrg.code}
                value={deleteConfirmationCode}
                onChange={(e) => setDeleteConfirmationCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: Attach Branch to Organization */}
      {attachingOrg && (
        <Modal
          isOpen={true}
          onClose={() => setAttachingOrg(null)}
          title={`Attach Branch: ${attachingOrg.name}`}
          description="Select an existing hospital or clinic location to link under this enterprise organization hierarchy."
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttachingOrg(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAttachBranchSubmit}
                disabled={isSubmitting || !selectedClinicToAttach}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? 'Linking...' : 'Link Branch'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Clinic Location
              </label>
              <select
                value={selectedClinicToAttach}
                onChange={(e) => setSelectedClinicToAttach(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choose a clinic to attach --</option>
                {clinics
                  .filter((c) => c.organizationId !== attachingOrg.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code} • {c.city || 'Pune'}) {c.organizationId ? '[Reassign]' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
