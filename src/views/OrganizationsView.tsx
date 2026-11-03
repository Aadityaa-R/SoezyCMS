import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Building2,
  ShieldCheck,
  Plus,
  Edit3,
  Trash2,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Hospital,
  Search,
  Copy,
  Check,
} from 'lucide-react';
import { Organization, LicenseTier, FacilityModule, ProvisionedAdminInfo } from '@/types';

interface OrganizationsViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
}

const ALL_FACILITIES: { id: FacilityModule; label: string; description: string }[] = [
  { id: 'OPD', label: 'OPD (Outpatient)', description: 'Outpatient consultations and scheduling' },
  { id: 'IPD', label: 'IPD (Inpatient)', description: 'Inpatient admissions and bed allocation' },
  { id: 'Pharmacy', label: 'Pharmacy', description: 'Drug formulary and dispensary' },
  { id: 'Laboratory', label: 'Laboratory', description: 'Diagnostic test orders and pathology' },
  { id: 'Emergency', label: 'Emergency', description: 'Urgent care triage and trauma queue' },
  { id: 'Billing', label: 'Billing', description: 'Invoicing and payment reconciliation' },
];

const LICENSE_TIER_DETAILS: Record<
  LicenseTier,
  { label: string; maxBranchesDefault: number; maxDoctorsDefault: number }
> = {
  starter: {
    label: 'Starter Tier',
    maxBranchesDefault: 2,
    maxDoctorsDefault: 10,
  },
  professional: {
    label: 'Professional Tier',
    maxBranchesDefault: 5,
    maxDoctorsDefault: 30,
  },
  enterprise: {
    label: 'Enterprise Tier',
    maxBranchesDefault: 10,
    maxDoctorsDefault: 100,
  },
  custom: {
    label: 'Custom Tier',
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
  const [appointMode, setAppointMode] = useState<'select_existing' | 'provision_new'>('select_existing');
  const [appointedName, setAppointedName] = useState('');
  const [appointedEmail, setAppointedEmail] = useState('');
  const [appointedUsername, setAppointedUsername] = useState('');
  const [appointedPassword, setAppointedPassword] = useState('Admin@12345');
  const [appointedPhone, setAppointedPhone] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [provisionedAdminResult, setProvisionedAdminResult] = useState<ProvisionedAdminInfo | null>(null);
  const [hasCopiedAdminCreds, setHasCopiedAdminCreds] = useState(false);

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
  const totalBranchesCount = useMemo(() => clinics.length, [clinics]);
  const totalDoctorsCount = useMemo(() => doctors.length, [doctors]);

  // Helper for license expiry info
  const getLicenseInfo = (org: Organization) => {
    const validDate = new Date(org.licenseValidUntil);
    const now = new Date();
    const diffTime = validDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Expired',
        statusColor: 'text-rose-600 dark:text-rose-400',
        remainingText: `Expired ${Math.abs(diffDays)}d ago`,
      };
    }
    if (diffDays <= 30) {
      return {
        label: 'Expiring Soon',
        statusColor: 'text-amber-600 dark:text-amber-400',
        remainingText: `${diffDays}d remaining`,
      };
    }
    return {
      label: 'Active',
      statusColor: 'text-emerald-600 dark:text-emerald-400',
      remainingText: `${diffDays}d remaining`,
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
    setAppointMode('select_existing');
    setAppointedName(org.appointedAdminName || '');
    setAppointedEmail(org.appointedAdminEmail || '');
    setAppointedUsername(`${org.code.toLowerCase()}_admin`);
    setAppointedPassword('Admin@12345');
    setAppointedPhone(org.phone || '');
    setSelectedStaffId(org.appointedAdminId || '');
    setProvisionedAdminResult(null);
    setHasCopiedAdminCreds(false);
    setFormError('');
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
    if (appointMode === 'provision_new' && !appointedUsername.trim()) {
      setFormError('Username is required for provisioning an administrator.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const res = await appointOrganizationAdmin(appointingOrg.id, {
        isNewAccount: appointMode === 'provision_new',
        adminId: appointMode === 'select_existing' ? selectedStaffId : undefined,
        adminName: appointedName.trim(),
        adminEmail: appointedEmail.trim(),
        adminUsername: appointedUsername.trim().toLowerCase(),
        adminPassword: appointedPassword.trim(),
        adminPhone: appointedPhone.trim(),
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to appoint administrator.');
        setIsSubmitting(false);
        return;
      }

      if (res.provisionedAdmin) {
        setProvisionedAdminResult(res.provisionedAdmin);
      } else {
        setAppointingOrg(null);
      }
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
    setFormError('');
    try {
      const res = await linkClinicToOrganization(selectedClinicToAttach, attachingOrg.id);
      if (!res.success) {
        setFormError(res.error || 'Failed to attach branch.');
        setIsSubmitting(false);
        return;
      }
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
    <div className="space-y-5">
      {/* Minimalist Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Organizations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enterprise healthcare networks, software licensing quotas, facility modules, and branch governance.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </Button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Organizations
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {organizations.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">enterprise groups</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Operating Branches
            </span>
            <Hospital className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalBranchesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">hospital locations</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Enrolled Doctors
            </span>
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalDoctorsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">clinical providers</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Licensing Compliance
            </span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              100%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">valid & active</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by organization name, code, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="space-y-4">
        {filteredOrganizations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-10 text-center">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No organizations found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              No enterprise organizations match your criteria. Create a new organization to get started.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="mt-3"
            >
              Create Organization
            </Button>
          </div>
        ) : (
          filteredOrganizations.map((org) => {
            const licenseInfo = getLicenseInfo(org);
            const tierConfig = LICENSE_TIER_DETAILS[org.licenseTier] || LICENSE_TIER_DETAILS.enterprise;
            const orgClinics = clinics.filter((c) => c.organizationId === org.id);
            const isExpanded = expandedBranches[org.id] ?? true;

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Organization Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        {org.name}
                      </h2>
                      <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {org.code}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {tierConfig.label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className={`text-xs font-medium ${licenseInfo.statusColor}`}>
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

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openAppointModal(org)}
                      className="text-xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Appoint Admin</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openEditModal(org)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Licensing</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => openDeleteModal(org)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>

                {/* Minimalist Details Grid */}
                <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Software Licensing & Capacity */}
                  <div className="space-y-2.5 bg-slate-50/60 dark:bg-slate-800/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Licensing & Quotas
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {org.licenseNumber}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Branch Capacity:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {orgClinics.length} of {org.maxBranches} branches
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Doctor Limit:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {totalDoctorsCount} of {org.maxDoctors} doctors
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                        <span className="text-slate-500 dark:text-slate-400">Validity:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {org.licenseValidUntil ? new Date(org.licenseValidUntil).toLocaleDateString() : 'Active'} ({licenseInfo.remainingText})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Appointed Administrator */}
                  <div className="space-y-2.5 bg-slate-50/60 dark:bg-slate-800/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Appointed Administrator
                      </span>
                      <span className="text-slate-400">
                        Primary Authority
                      </span>
                    </div>

                    {org.appointedAdminName ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Name:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {org.appointedAdminName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Email:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {org.appointedAdminEmail || 'Not configured'}
                          </span>
                        </div>
                        <div className="pt-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openAppointModal(org)}
                            className="w-full text-xs"
                          >
                            Change Administrator
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 text-center space-y-2">
                        <p className="text-slate-400">No administrator appointed.</p>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openAppointModal(org)}
                          className="text-xs"
                        >
                          Appoint Administrator
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Facility Modules */}
                  <div className="space-y-2.5 bg-slate-50/60 dark:bg-slate-800/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Facility Modules
                      </span>
                      <span className="text-slate-400">
                        {org.facilities?.length || 0} Enabled
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {ALL_FACILITIES.map((facility) => {
                        const isEnabled = org.facilities?.includes(facility.id);
                        return (
                          <div
                            key={facility.id}
                            className={`px-2 py-1.5 rounded text-xs text-center border font-medium ${
                              isEnabled
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-transparent border-dashed border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                            }`}
                          >
                            {facility.id}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Operating Branches List */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() =>
                        setExpandedBranches((prev) => ({ ...prev, [org.id]: !isExpanded }))
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Hospital className="w-3.5 h-3.5 text-slate-400" />
                      <span>Operating Branches ({orgClinics.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openAttachBranchModal(org)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach Branch</span>
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2">
                      {orgClinics.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1">
                          No hospital branches attached to this organization.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {orgClinics.map((clinic) => {
                            const isCurrent = clinic.id === activeClinicId;
                            return (
                              <div
                                key={clinic.id}
                                className={`p-3 rounded-lg border text-xs ${
                                  isCurrent
                                    ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600'
                                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {clinic.name}
                                      </span>
                                      {isCurrent && (
                                        <span className="px-1 py-0.2 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-500">
                                      {clinic.code} • {clinic.city || 'Headquarters'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 mt-1.5">
                                  <button
                                    onClick={() => handleSwitchToBranch(clinic.id)}
                                    disabled={isCurrent}
                                    className={`text-xs font-medium flex items-center gap-1 ${
                                      isCurrent
                                        ? 'text-slate-400 cursor-default'
                                        : 'text-blue-600 dark:text-blue-400 hover:underline'
                                    }`}
                                  >
                                    <span>{isCurrent ? 'Current Clinic' : 'Switch Branch'}</span>
                                    {!isCurrent && <ExternalLink className="w-3 h-3" />}
                                  </button>

                                  <button
                                    onClick={() => linkClinicToOrganization(clinic.id, null)}
                                    className="text-[11px] text-slate-400 hover:text-rose-500"
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
          description="Provision a new healthcare organization with licensing tier and facility authorization."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
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
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subiksham Healthcare Group"
                  value={newOrgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUBIKSHAM"
                  value={newOrgCode}
                  onChange={(e) => setNewOrgCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  placeholder="e.g. Pune"
                  value={newOrgCity}
                  onChange={(e) => setNewOrgCity(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>
            </div>

            {/* Licensing & Quotas */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Licensing & Capacity Quotas
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    License Tier
                  </label>
                  <select
                    value={newOrgLicenseTier}
                    onChange={(e) => handleTierChange(e.target.value as LicenseTier)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Facility Modules */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Authorized Facility Modules
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_FACILITIES.map((facility) => {
                  const isChecked = newOrgFacilities.includes(facility.id);
                  return (
                    <label
                      key={facility.id}
                      className={`p-2 rounded border text-xs cursor-pointer flex items-center gap-2 ${
                        isChecked
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-medium'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFacility(newOrgFacilities, setNewOrgFacilities, facility.id)}
                        className="rounded border-slate-300 h-3.5 w-3.5"
                      />
                      <span>{facility.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Initial Appointed Administrator */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Initial Appointed Administrator (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meera Krishnan"
                    value={newOrgAdminName}
                    onChange={(e) => setNewOrgAdminName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@hospital.local"
                    value={newOrgAdminEmail}
                    onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
          description="Update subscription terms, capacity allocations, and authorized clinical wings."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Authorized Facilities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_FACILITIES.map((facility) => {
                  const isChecked = editFacilities.includes(facility.id);
                  return (
                    <label
                      key={facility.id}
                      className={`p-2 rounded border text-xs cursor-pointer flex items-center gap-2 ${
                        isChecked
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-medium'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFacility(editFacilities, setEditFacilities, facility.id)}
                        className="rounded border-slate-300 h-3.5 w-3.5"
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
          description={
            provisionedAdminResult
              ? 'Administrator account has been provisioned. Please securely share these credentials.'
              : 'Designate an existing administrator or provision a new institutional authority account.'
          }
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              {provisionedAdminResult ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAppointingOrg(null)}
                >
                  Done
                </Button>
              ) : (
                <>
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
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : appointMode === 'provision_new'
                      ? 'Provision & Appoint'
                      : 'Confirm Appointment'}
                  </Button>
                </>
              )}
            </div>
          }
        >
          {provisionedAdminResult ? (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Generated Administrator Credentials
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Administrator</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {provisionedAdminResult.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Email</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {provisionedAdminResult.email}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Username</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {provisionedAdminResult.username}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Temporary Password</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {provisionedAdminResult.temporaryPassword}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500">Bound to {appointingOrg.name} ({appointingOrg.code})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = [
                        `Organization: ${appointingOrg.name} (${appointingOrg.code})`,
                        `Role: Clinic Administrator (admin)`,
                        `Username: ${provisionedAdminResult.username}`,
                        `Temporary Password: ${provisionedAdminResult.temporaryPassword}`,
                        `Email: ${provisionedAdminResult.email}`,
                      ].join('\n');
                      navigator.clipboard.writeText(text);
                      setHasCopiedAdminCreds(true);
                      setTimeout(() => setHasCopiedAdminCreds(false), 2500);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {hasCopiedAdminCreds ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAppointSubmit} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                <button
                  type="button"
                  onClick={() => setAppointMode('select_existing')}
                  className={`py-1.5 text-xs font-medium rounded transition-colors ${
                    appointMode === 'select_existing'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Select Existing Staff
                </button>
                <button
                  type="button"
                  onClick={() => setAppointMode('provision_new')}
                  className={`py-1.5 text-xs font-medium rounded transition-colors ${
                    appointMode === 'provision_new'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Provision New Account
                </button>
              </div>

              {appointMode === 'select_existing' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select from Staff Directory
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => handleStaffSelect(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 mb-2"
                    >
                      <option value="">-- Or enter custom administrator below --</option>
                      {staffAccessList
                        .filter((s) => s.role === 'admin' || s.role === 'md')
                        .map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.staffName} ({staff.staffTitle})
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
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
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
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anand Mahindra"
                        value={appointedName}
                        onChange={(e) => setAppointedName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. subiksham_admin"
                        value={appointedUsername}
                        onChange={(e) => setAppointedUsername(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono lowercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Temporary Password *
                      </label>
                      <input
                        type="text"
                        required
                        value={appointedPassword}
                        onChange={(e) => setAppointedPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Official Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+91 90000 00000"
                        value={appointedPhone}
                        onChange={(e) => setAppointedPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@organization.local"
                      value={appointedEmail}
                      onChange={(e) => setAppointedEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                    />
                  </div>
                </>
              )}
            </form>
          )}
        </Modal>
      )}

      {/* MODAL 4: Delete Organization Confirmation */}
      {deletingOrg && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingOrg(null)}
          title={`Delete Organization: ${deletingOrg.name}`}
          description="Permanently delete this organization. Attached branches will be safely detached as independent clinics."
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
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
                {isSubmitting ? 'Deleting...' : 'Delete Organization'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5">
            <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              Attached hospital branches will be detached as standalone clinics. Patient records and medical charts will remain intact.
            </div>

            {formError && (
              <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type <span className="font-mono font-bold">{deletingOrg.code}</span> to confirm:
              </label>
              <input
                type="text"
                placeholder={deletingOrg.code}
                value={deleteConfirmationCode}
                onChange={(e) => setDeleteConfirmationCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: Attach Branch to Organization */}
      {attachingOrg && (() => {
        const currentBranches = clinics.filter((c) => c.organizationId === attachingOrg.id).length;
        const maxBranches = attachingOrg.maxBranches ?? 5;
        const isQuotaReached = currentBranches >= maxBranches;

        return (
          <Modal
            isOpen={true}
            onClose={() => setAttachingOrg(null)}
            title={`Attach Branch: ${attachingOrg.name}`}
            description={`Attach an existing clinic location. Quota: ${currentBranches} of ${maxBranches} branches attached.`}
            maxWidth="sm"
            footer={
              <div className="flex items-center justify-end gap-2.5 w-full">
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
                  disabled={isSubmitting || !selectedClinicToAttach || isQuotaReached}
                >
                  {isSubmitting ? 'Linking...' : 'Link Branch'}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {isQuotaReached && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  Branch quota reached: This organization is currently at its licensed limit of {maxBranches} branches. Upgrade the license tier in Licensing to attach additional branches.
                </div>
              )}

              {formError && (
                <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Clinic Location
                </label>
                <select
                  disabled={isQuotaReached}
                  value={selectedClinicToAttach}
                  onChange={(e) => setSelectedClinicToAttach(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 disabled:opacity-50"
                >
                  <option value="">-- Choose a clinic to attach --</option>
                  {clinics
                    .filter((c) => c.organizationId !== attachingOrg.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) {c.organizationId ? '[Reassign]' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
