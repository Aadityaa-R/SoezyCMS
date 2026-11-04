import React, { useState, useMemo, useEffect } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ClinicAdministrativeProfile,
  ClinicOperationalStatus,
  BranchType,
  ClinicRegistrationParams,
} from '@/types/superAdmin';
import {
  FACILITY_CLASSIFICATIONS,
  FACILITY_TYPE_BUNDLES,
  FacilityClassification,
  calculateModulesForClassifications,
  formatClassifications,
  getClinicClassifications,
} from '@/lib/facilityClassifications';

interface ClinicBranchManagementProps {
  onNavigate: (tab: string, subTab?: string) => void;
  initialSubTab?: string;
}

export const ClinicBranchManagement: React.FC<ClinicBranchManagementProps> = ({
  onNavigate,
  initialSubTab,
}) => {
  const {
    clinics,
    agreements,
    onboarding,
    auditLogs,
    registerClinic,
    changeClinicStatus,
    updateClinicFacilityClassification,
    setSelectedClinicId,
  } = useSuperAdmin();

  // Filters & Search
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState<string>('all');

  // Pagination (Strictly 3 main branch cards per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  // View state: Main Branch Details or Side Branch Details
  const [viewingMainBranchId, setViewingMainBranchId] = useState<string | null>(null);
  const [viewingSideBranchId, setViewingSideBranchId] = useState<string | null>(null);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(initialSubTab === 'register');
  const [statusChangeClinic, setStatusChangeClinic] = useState<ClinicAdministrativeProfile | null>(null);
  const [targetStatus, setTargetStatus] = useState<ClinicOperationalStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New clinic form fields
  const [isNewMainBranch, setIsNewMainBranch] = useState(true);
  const [selectedParentClinicId, setSelectedParentClinicId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBranchType, setNewBranchType] = useState<BranchType>('main_hospital');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newStateVal, setNewStateVal] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newFacilityClassifications, setNewFacilityClassifications] = useState<FacilityClassification[]>(['OPD']);

  // Classification modal state
  const [classificationModalClinic, setClassificationModalClinic] = useState<ClinicAdministrativeProfile | null>(null);
  const [selectedClassifications, setSelectedClassifications] = useState<FacilityClassification[]>(['OPD']);
  const [classificationReason, setClassificationReason] = useState('');
  const [classificationError, setClassificationError] = useState('');
  const [isSavingClassification, setIsSavingClassification] = useState(false);

  const toggleClassification = (type: FacilityClassification) => {
    setSelectedClassifications((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) {
          setClassificationError('At least one facility classification (OPD, IPD, or Lab) must remain selected.');
          return prev;
        }
        setClassificationError('');
        return prev.filter((t) => t !== type);
      } else {
        setClassificationError('');
        return [...prev, type];
      }
    });
  };

  const toggleNewClassification = (type: FacilityClassification) => {
    setNewFacilityClassifications((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) {
          setFormError('At least one facility classification (OPD, IPD, or Lab) must remain selected.');
          return prev;
        }
        setFormError('');
        return prev.filter((t) => t !== type);
      } else {
        setFormError('');
        return [...prev, type];
      }
    });
  };

  const openClassificationModal = (clinic: ClinicAdministrativeProfile) => {
    setClassificationModalClinic(clinic);
    setSelectedClassifications(getClinicClassifications(clinic));
    setClassificationReason('');
    setClassificationError('');
  };

  const handleSaveClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classificationModalClinic) return;
    if (selectedClassifications.length === 0) {
      setClassificationError('Please select at least one facility classification.');
      return;
    }

    setIsSavingClassification(true);
    setClassificationError('');

    try {
      await updateClinicFacilityClassification(
        classificationModalClinic.id,
        selectedClassifications,
        classificationReason || `Updated facility classification to ${selectedClassifications.join(', ')}`
      );
      setClassificationModalClinic(null);
    } catch (err: any) {
      setClassificationError(err?.message || 'Failed to update facility classification.');
    } finally {
      setIsSavingClassification(false);
    }
  };

  // Hierarchy Helpers
  const isMainBranch = (clinic: ClinicAdministrativeProfile): boolean => {
    if (clinic.parentClinicId) return false;
    if (clinic.isMainBranch !== undefined) return clinic.isMainBranch;
    return clinic.branchType !== 'satellite_branch';
  };

  const mainBranches = useMemo(() => clinics.filter(isMainBranch), [clinics]);

  const getLinkedSideBranches = (mainBranchId: string) => {
    return clinics.filter((c) => c.parentClinicId === mainBranchId);
  };

  // Filtered Main Branches for Card Grid
  const filteredMainBranches = useMemo(() => {
    return mainBranches.filter((c) => {
      // Tab filter
      if (activeTabFilter === 'active' && c.status !== 'active') return false;
      if (activeTabFilter === 'inactive' && c.status !== 'inactive' && c.status !== 'suspended') return false;
      if (activeTabFilter === 'pending' && c.status !== 'pending_onboarding' && c.status !== 'pending_activation') return false;

      // Branch Type
      if (branchTypeFilter !== 'all' && c.branchType !== branchTypeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        const matchAdmin = (c.appointedAdminName || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCity && !matchAdmin) return false;
      }

      return true;
    });
  }, [mainBranches, activeTabFilter, branchTypeFilter, searchQuery]);

  // Reset to page 1 whenever filters change
  const handleTabFilterChange = (tab: 'all' | 'active' | 'inactive' | 'pending') => {
    setActiveTabFilter(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleBranchTypeChange = (type: string) => {
    setBranchTypeFilter(type);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMainBranches.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMainBranches = useMemo(() => {
    return filteredMainBranches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMainBranches, startIndex, ITEMS_PER_PAGE]);

  // Active viewing profiles
  const viewingMainBranch = useMemo(() => {
    if (!viewingMainBranchId) return null;
    return clinics.find((c) => c.id === viewingMainBranchId) || null;
  }, [viewingMainBranchId, clinics]);

  const viewingSideBranch = useMemo(() => {
    if (!viewingSideBranchId) return null;
    return clinics.find((c) => c.id === viewingSideBranchId) || null;
  }, [viewingSideBranchId, clinics]);

  const parentOfSideBranch = useMemo(() => {
    if (!viewingSideBranch?.parentClinicId) return null;
    return clinics.find((c) => c.id === viewingSideBranch.parentClinicId) || null;
  }, [viewingSideBranch, clinics]);

  // Keep selectedClinicId synced for global super admin context
  useEffect(() => {
    if (viewingSideBranchId) {
      setSelectedClinicId(viewingSideBranchId);
    } else if (viewingMainBranchId) {
      setSelectedClinicId(viewingMainBranchId);
    }
  }, [viewingSideBranchId, viewingMainBranchId, setSelectedClinicId]);

  // Handle register clinic submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      setFormError('Clinic name and unique branch code are required.');
      return;
    }

    if (!isNewMainBranch && !selectedParentClinicId) {
      setFormError('Please select a parent Main Branch for this side branch.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const params: ClinicRegistrationParams = {
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        branchType: newBranchType,
        phone: newPhone.trim(),
        email: newEmail.trim(),
        primaryContactName: newContactName.trim() || 'Central Admin',
        primaryContactDesignation: newContactDesignation.trim() || 'Operations Manager',
        address: newAddress.trim() || 'Main Campus',
        city: newCity.trim() || 'Pune',
        state: newStateVal.trim() || 'Maharashtra',
        postalCode: newPostalCode.trim() || '411001',
        registrationNumber: newRegNumber.trim(),
        isMainBranch: isNewMainBranch,
        parentClinicId: isNewMainBranch ? undefined : selectedParentClinicId,
        facilityClassifications: newFacilityClassifications,
      };

      const created = await registerClinic(params);
      setIsRegisterModalOpen(false);

      if (isNewMainBranch) {
        setViewingMainBranchId(created.id);
        setViewingSideBranchId(null);
      } else {
        setViewingMainBranchId(selectedParentClinicId);
        setViewingSideBranchId(created.id);
      }

      // Reset form
      setNewName('');
      setNewCode('');
      setNewPhone('');
      setNewEmail('');
      setNewContactName('');
      setNewContactDesignation('');
      setNewAddress('');
      setNewCity('');
      setNewStateVal('');
      setNewPostalCode('');
      setNewRegNumber('');
      setNewFacilityClassifications(['OPD']);
      setIsNewMainBranch(true);
      setSelectedParentClinicId('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register clinic branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change submit
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeClinic) return;
    if (!statusReason.trim()) {
      setFormError('An authorized operational reason is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await changeClinicStatus(statusChangeClinic.id, targetStatus, statusReason);
    if (!res.success) {
      setFormError(res.error || 'Failed to update clinic status.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setStatusChangeClinic(null);
    setStatusReason('');
  };

  // Helper status renderer: small dot in color with status text displayed in black/dark without box
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let dotColor = 'bg-slate-400';
    if (s === 'active' || s === 'completed') {
      dotColor = 'bg-emerald-500';
    } else if (s.includes('pending') || s.includes('progress') || s.includes('soon')) {
      dotColor = 'bg-amber-500';
    } else if (s.includes('suspend') || s.includes('inactive') || s.includes('expired')) {
      dotColor = 'bg-rose-500';
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 capitalize">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
        <span>{status.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  // Shared Modals rendered across all views (Side Branch Details, Main Branch Details, Main Listing)
  const renderSharedModals = () => (
    <>
      {statusChangeClinic && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setStatusChangeClinic(null)}
          title={`Update Status: ${statusChangeClinic.name}`}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusChangeClinic(null)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStatusChangeSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Status Change'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleStatusChangeSubmit} className="space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Target Operational Status
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as ClinicOperationalStatus)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="active">Active (Full Operation)</option>
                <option value="pending_onboarding">Pending Onboarding</option>
                <option value="pending_activation">Pending Activation Review</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended (Contractual / Regulatory Hold)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Authorized Operational Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="State administrative justification for audit trail..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {classificationModalClinic && (
        <Modal
          isOpen={true}
          onClose={() => !isSavingClassification && setClassificationModalClinic(null)}
          title={`Update Facility Classification: ${classificationModalClinic.name}`}
          description="Classify this branch strictly using OPD, IPD, and Lab. Functional module bundles and billing features are automatically provisioned."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClassificationModalClinic(null)}
                disabled={isSavingClassification}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveClassification}
                disabled={isSavingClassification}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSavingClassification ? 'Saving Classification...' : 'Save Classification'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveClassification} className="space-y-4 text-xs">
            {classificationError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {classificationError}
              </div>
            )}

            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-semibold mb-1.5">
                Select Approved Facility Types (Only OPD, IPD, and Lab permitted)
              </label>
              <div className="space-y-2">
                {FACILITY_CLASSIFICATIONS.map((type) => {
                  const bundle = FACILITY_TYPE_BUNDLES[type];
                  const isChecked = selectedClassifications.includes(type);

                  return (
                    <label
                      key={type}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/60'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClassification(type)}
                        className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {bundle.name} ({bundle.shortCode})
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {bundle.modules.length} modules
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {bundle.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Live Preview of Resulting Module Bundle */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Automated Module Bundle Preview
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {calculateModulesForClassifications(selectedClassifications).length} deduplicated modules
                </span>
              </div>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {calculateModulesForClassifications(selectedClassifications).map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Note: Operational modules cannot be toggled individually. Selecting facility types automatically provisions all required functionality including specialized billing.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Administrative Justification / Reason (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="State reason for facility classification adjustment..."
                value={classificationReason}
                onChange={(e) => setClassificationReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );

  // =========================================================================
  // VIEW: INDIVIDUAL SIDE BRANCH ADMINISTRATIVE DETAILS
  // =========================================================================
  if (viewingSideBranch) {
    const branchAgreement = agreements.find(
      (a) => a.clinicId === viewingSideBranch.id || a.clinicId === viewingSideBranch.parentClinicId
    );
    const branchOnboarding = onboarding.filter((o) => o.clinicId === viewingSideBranch.id);
    const branchAuditLogs = auditLogs.filter(
      (a) =>
        a.targetId === viewingSideBranch.id ||
        a.targetName.toLowerCase().includes(viewingSideBranch.code.toLowerCase()) ||
        a.targetName.toLowerCase().includes(viewingSideBranch.name.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingSideBranchId(null)}
              className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Parent Main Branch</span>
            </button>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {viewingSideBranch.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusChangeClinic(viewingSideBranch);
                setTargetStatus(viewingSideBranch.status === 'active' ? 'suspended' : 'active');
                setStatusReason('');
                setFormError('');
              }}
              className="text-xs rounded border border-slate-300 dark:border-slate-700"
            >
              {viewingSideBranch.status === 'active' ? 'Suspend Branch' : 'Activate Branch'}
            </Button>
          </div>
        </div>

        {/* Parent-Child Relationship Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Affiliated Main Branch: </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {parentOfSideBranch ? parentOfSideBranch.name : 'Central Healthcare Organization'}
            </span>
            {parentOfSideBranch && (
              <span className="text-[11px] font-mono text-slate-500 ml-1.5">
                ({parentOfSideBranch.code})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Branch Hierarchy:</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Side Branch
            </span>
          </div>
        </div>

        {/* Section A: Side Branch Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section A: Side Branch Overview
            </h2>
            <div className="flex items-center gap-2">
              {renderStatusBadge(viewingSideBranch.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-500 block text-[11px]">Side Branch Name</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{viewingSideBranch.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Branch Code / Registration ID</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {viewingSideBranch.code} &bull; {viewingSideBranch.registrationNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Branch Type</span>
              <span className="capitalize text-slate-800 dark:text-slate-200 font-medium">
                {viewingSideBranch.branchType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 block text-[11px]">Address & Location</span>
              <span className="text-slate-800 dark:text-slate-200">
                {viewingSideBranch.address}, {viewingSideBranch.city}, {viewingSideBranch.state} - {viewingSideBranch.postalCode}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Contact & Email</span>
              <span className="text-slate-800 dark:text-slate-200 block">{viewingSideBranch.phone}</span>
              <span className="text-slate-500 font-mono text-[11px] block">{viewingSideBranch.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Appointed Clinic Admin</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {viewingSideBranch.appointedAdminName || 'None Appointed'}
              </span>
              {viewingSideBranch.appointedAdminEmail && (
                <span className="text-[11px] text-slate-500 font-mono block">
                  {viewingSideBranch.appointedAdminEmail}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Onboarding Status</span>
              <div className="mt-0.5">{renderStatusBadge(viewingSideBranch.onboardingStatus)}</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Branch Activation Status</span>
              <div className="mt-0.5">{renderStatusBadge(viewingSideBranch.status)}</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Facility Classification</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatClassifications(viewingSideBranch.facilityClassifications || viewingSideBranch.optedFacilities)}
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5 font-mono">
                ({calculateModulesForClassifications(getClinicClassifications(viewingSideBranch)).length} automated modules)
              </span>
            </div>
          </div>
        </div>

        {/* Section C: Agreement Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section C: Licence Agreement Details
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('super_agreements')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Open Agreements Module &rarr;
            </button>
          </div>

          {branchAgreement ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement ID / Reference</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {branchAgreement.agreementReference}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement Status</span>
                <div className="mt-0.5">{renderStatusBadge(branchAgreement.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Validity Period</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {branchAgreement.startDate} to {branchAgreement.endDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement Document</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {branchAgreement.secureDocumentName || 'Master_Network_Agreement.pdf'} ({branchAgreement.secureDocumentSize || '2.1 MB'})
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">Agreement Scope & Remarks</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {branchAgreement.remarks || 'Covered under parent healthcare organization master licence.'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              No direct licence agreement uploaded. Branch operations govern under parent hospital SLA.
            </p>
          )}
        </div>

        {/* Section D: Facility Classification & Automated Module Entitlements */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Section D: Facility Classification & Automated Module Entitlements
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Classify facility wings (OPD, IPD, Lab). Side branches maintain independent classifications from their parent main branch.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openClassificationModal(viewingSideBranch)}
              className="text-xs rounded border border-slate-300 dark:border-slate-700 cursor-pointer self-start sm:self-auto"
            >
              Update Facility Classification
            </Button>
          </div>

          {/* Active Facility Classifications (Only 3 permitted: OPD, IPD, Lab) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FACILITY_CLASSIFICATIONS.map((facType) => {
              const bundle = FACILITY_TYPE_BUNDLES[facType];
              const currentClassifications = getClinicClassifications(viewingSideBranch);
              const isAssigned = currentClassifications.includes(facType);

              return (
                <div
                  key={facType}
                  className={`p-3 rounded-lg border transition-colors ${
                    isAssigned
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/60'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {bundle.name} ({bundle.shortCode})
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-900 dark:text-slate-100">
                      <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} shrink-0`} />
                      <span>{isAssigned ? 'Classified' : 'Not Opted'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                    {bundle.description}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Predefined Modules:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                      {bundle.modules.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Combined Deduplicated Modules Display */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Automatically Provisioned CMS Operational Modules ({calculateModulesForClassifications(getClinicClassifications(viewingSideBranch)).length} Total)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Derived strictly from approved side branch facilities
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {calculateModulesForClassifications(getClinicClassifications(viewingSideBranch)).map((modName) => (
                <span
                  key={modName}
                  className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {modName}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2.5">
              Administrative Note: Each side branch maintains its own facility classification independently of the parent main branch. Super Admin controls classification only; individual operational modules cannot be manually toggled.
            </p>
          </div>
        </div>

        {/* Section E: Onboarding Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section E: Branch Onboarding Details
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('super_onboarding')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Review Full Checklist &rarr;
            </button>
          </div>

          {branchOnboarding.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {branchOnboarding.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30"
                >
                  <div className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {item.completed ? (item.completedAt || 'Verified') : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              Onboarding stage: {viewingSideBranch.onboardingStatus.replace(/_/g, ' ')}. Standard governance verified.
            </p>
          )}
        </div>

        {/* Section F: Administrative Activity */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section F: Administrative Activity & Audit Trail
            </h2>
          </div>

          {branchAuditLogs.length > 0 ? (
            <div className="space-y-2 pt-1 text-xs">
              {branchAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {log.reason || 'Operational update executed.'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">{log.actorName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              No recent administrative audit records found for this side branch.
            </p>
          )}
        </div>

        {renderSharedModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN BRANCH DETAILS VIEW (With Side Branches List & All 6 Sections)
  // =========================================================================
  if (viewingMainBranch) {
    const linkedSideBranches = getLinkedSideBranches(viewingMainBranch.id);
    const mainAgreement = agreements.find((a) => a.clinicId === viewingMainBranch.id);
    const mainOnboarding = onboarding.filter((o) => o.clinicId === viewingMainBranch.id);
    const mainAuditLogs = auditLogs.filter(
      (a) =>
        a.targetId === viewingMainBranch.id ||
        a.targetName.toLowerCase().includes(viewingMainBranch.code.toLowerCase()) ||
        a.targetName.toLowerCase().includes(viewingMainBranch.name.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewingMainBranchId(null);
                setViewingSideBranchId(null);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Main Branches</span>
            </button>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {viewingMainBranch.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusChangeClinic(viewingMainBranch);
                setTargetStatus(viewingMainBranch.status === 'active' ? 'suspended' : 'active');
                setStatusReason('');
                setFormError('');
              }}
              className="text-xs rounded border border-slate-300 dark:border-slate-700"
            >
              {viewingMainBranch.status === 'active' ? 'Suspend Main Branch' : 'Activate Main Branch'}
            </Button>
          </div>
        </div>

        {/* Section A: Main Branch Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Section A: Main Branch Overview
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Main Branch
              </span>
              {renderStatusBadge(viewingMainBranch.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-500 block text-[11px]">Main Branch Name</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{viewingMainBranch.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Clinic Code / Registration ID</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {viewingMainBranch.code} &bull; {viewingMainBranch.registrationNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Branch Type</span>
              <span className="capitalize text-slate-800 dark:text-slate-200 font-medium">
                {viewingMainBranch.branchType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500 block text-[11px]">Campus Physical Address</span>
              <span className="text-slate-800 dark:text-slate-200">
                {viewingMainBranch.address}, {viewingMainBranch.city}, {viewingMainBranch.state} - {viewingMainBranch.postalCode}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Official Phone & Email</span>
              <span className="text-slate-800 dark:text-slate-200 block">{viewingMainBranch.phone}</span>
              <span className="text-slate-500 font-mono text-[11px] block">{viewingMainBranch.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Appointed Clinic Admin</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {viewingMainBranch.appointedAdminName || 'None Appointed'}
              </span>
              {viewingMainBranch.appointedAdminEmail && (
                <span className="text-[11px] text-slate-500 font-mono block">
                  {viewingMainBranch.appointedAdminEmail}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Onboarding Status</span>
              <div className="mt-0.5">{renderStatusBadge(viewingMainBranch.onboardingStatus)}</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Associated Side Branches</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {linkedSideBranches.length} {linkedSideBranches.length === 1 ? 'side branch' : 'side branches'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Facility Classification</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatClassifications(viewingMainBranch.facilityClassifications || viewingMainBranch.optedFacilities)}
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5 font-mono">
                ({calculateModulesForClassifications(getClinicClassifications(viewingMainBranch)).length} automated modules)
              </span>
            </div>
          </div>
        </div>

        {/* Section B: Side Branches (Important Section) */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Section B: Side Branches Grouped Under {viewingMainBranch.name}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hierarchy: {viewingMainBranch.name} (Main Branch) &rarr; {linkedSideBranches.length} Linked Side {linkedSideBranches.length === 1 ? 'Branch' : 'Branches'}
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
              ({linkedSideBranches.length} total)
            </span>
          </div>

          {linkedSideBranches.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              No side branches are currently linked to this main branch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Side Branch Name</th>
                    <th className="py-2.5 px-3">Branch Code</th>
                    <th className="py-2.5 px-3">Branch Type</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Appointed Admin</th>
                    <th className="py-2.5 px-3">Agreement</th>
                    <th className="py-2.5 px-3">Onboarding</th>
                    <th className="py-2.5 px-3">Activation</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {linkedSideBranches.map((side) => (
                    <tr
                      key={side.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {side.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {side.registrationNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {side.code}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">
                        {side.branchType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatClassifications(side.facilityClassifications || side.optedFacilities)}
                        </span>
                        <span className="text-[11px] text-slate-500 block font-mono">
                          {calculateModulesForClassifications(getClinicClassifications(side)).length} modules
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {side.city}, {side.state}
                      </td>
                      <td className="py-3 px-3">
                        {side.appointedAdminName ? (
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {side.appointedAdminName}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {side.appointedAdminEmail}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusBadge(side.agreementStatus || 'Active')}
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusBadge(side.onboardingStatus)}
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusBadge(side.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingSideBranchId(side.id)}
                          className="text-xs rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section C: Agreement Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section C: Licence Agreement Details
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('super_agreements')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Open Agreements Module &rarr;
            </button>
          </div>

          {mainAgreement ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement ID / Reference</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {mainAgreement.agreementReference}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement Status</span>
                <div className="mt-0.5">{renderStatusBadge(mainAgreement.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Validity Window</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {mainAgreement.startDate} to {mainAgreement.endDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement Document</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {mainAgreement.secureDocumentName || 'Master_Signed_Agreement.pdf'} ({mainAgreement.secureDocumentSize || '2.4 MB'})
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">Renewal / SLA Information</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {mainAgreement.remarks || 'Standard Master Enterprise SLA. Multi-site branch authorization.'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              No licence agreement record currently active for this main branch.
            </p>
          )}
        </div>

        {/* Section D: Facility Classification & Automated Module Entitlements */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Section D: Facility Classification & Automated Module Entitlements
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Classify facility wings (OPD, IPD, Lab). Functional modules and billing workflows are provisioned automatically.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openClassificationModal(viewingMainBranch)}
              className="text-xs rounded border border-slate-300 dark:border-slate-700 cursor-pointer self-start sm:self-auto"
            >
              Update Facility Classification
            </Button>
          </div>

          {/* Active Facility Classifications (Only 3 permitted: OPD, IPD, Lab) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FACILITY_CLASSIFICATIONS.map((facType) => {
              const bundle = FACILITY_TYPE_BUNDLES[facType];
              const currentClassifications = getClinicClassifications(viewingMainBranch);
              const isAssigned = currentClassifications.includes(facType);

              return (
                <div
                  key={facType}
                  className={`p-3 rounded-lg border transition-colors ${
                    isAssigned
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/60'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {bundle.name} ({bundle.shortCode})
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-900 dark:text-slate-100">
                      <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} shrink-0`} />
                      <span>{isAssigned ? 'Classified' : 'Not Opted'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                    {bundle.description}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Predefined Modules:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                      {bundle.modules.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Combined Deduplicated Modules Display */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Automatically Provisioned CMS Operational Modules ({calculateModulesForClassifications(getClinicClassifications(viewingMainBranch)).length} Total)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Derived strictly from selected facility classifications
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {calculateModulesForClassifications(getClinicClassifications(viewingMainBranch)).map((modName) => (
                <span
                  key={modName}
                  className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {modName}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2.5">
              Administrative Note: Super Admin manages only the facility classification (OPD, IPD, Lab). Predefined module bundles and billing features are automatically enabled without duplicating shared modules. Super Admin cannot individually toggle operational modules; internal desk configurations are governed by the Clinic Administrator.
            </p>
          </div>
        </div>

        {/* Section E: Onboarding Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section E: Branch Onboarding Details
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('super_onboarding')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Review Full Checklist &rarr;
            </button>
          </div>

          {mainOnboarding.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {mainOnboarding.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30"
                >
                  <div className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {item.completed ? (item.completedAt || 'Verified') : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              Onboarding stage: {viewingMainBranch.onboardingStatus.replace(/_/g, ' ')}. Standard governance verified.
            </p>
          )}
        </div>

        {/* Section F: Administrative Activity */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Section F: Administrative Activity & Audit Trail
            </h2>
          </div>

          {mainAuditLogs.length > 0 ? (
            <div className="space-y-2 pt-1 text-xs">
              {mainAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {log.reason || 'Operational update executed.'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">{log.actorName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              No recent administrative audit records found for this main branch.
            </p>
          )}
        </div>

        {renderSharedModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN LISTING - CARD-BASED MAIN BRANCH MANAGEMENT (3 CARDS PER PAGE)
  // =========================================================================
  return (
    <div className="space-y-4">
      <h1 className="sr-only">Main Branch Management</h1>

      {/* Directory Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs - COUNTS REPRESENT MAIN BRANCHES ONLY */}
        <div className="flex items-center gap-1 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 pb-2 sm:pb-0 overflow-x-auto">
          {[
            { id: 'all', label: `All Clinics (${mainBranches.length})` },
            { id: 'active', label: `Active (${mainBranches.filter((c) => c.status === 'active').length})` },
            { id: 'pending', label: `Pending (${mainBranches.filter((c) => c.status === 'pending_onboarding' || c.status === 'pending_activation').length})` },
            { id: 'inactive', label: `Inactive / Suspended (${mainBranches.filter((c) => c.status === 'inactive' || c.status === 'suspended').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabFilterChange(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                activeTabFilter === tab.id
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter & Search Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search main branches..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <select
            value={branchTypeFilter}
            onChange={(e) => handleBranchTypeChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Branch Types</option>
            <option value="main_hospital">Main Hospital</option>
            <option value="speciality_center">Speciality Center</option>
            <option value="outpatient_clinic">Outpatient Clinic</option>
          </select>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setFormError('');
              setIsRegisterModalOpen(true);
            }}
            className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Clinic</span>
          </Button>
        </div>
      </div>

      {/* Main Branch Card Grid (Desktop: Exactly 3 cards per row) */}
      {paginatedMainBranches.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
          No main branches match the selected criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMainBranches.map((branch) => {
            const linkedSideCount = getLinkedSideBranches(branch.id).length;

            return (
              <div
                key={branch.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                        {branch.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {branch.code} &bull; {branch.registrationNumber}
                      </div>
                    </div>
                    <div>
                      {renderStatusBadge(branch.status)}
                    </div>
                  </div>

                  {/* Card Key Administrative Details */}
                  <div className="space-y-2 py-2 border-t border-b border-slate-100 dark:border-slate-800/80 my-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Branch Type</span>
                      <span className="capitalize text-slate-800 dark:text-slate-200 font-medium">
                        {branch.branchType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Location</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {branch.city}, {branch.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Appointed Admin</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]">
                        {branch.appointedAdminName || 'None Appointed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Agreement</span>
                      <div>{renderStatusBadge(branch.agreementStatus || 'Active')}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Onboarding</span>
                      <div>{renderStatusBadge(branch.onboardingStatus)}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Facility Classification</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatClassifications(branch.facilityClassifications || branch.optedFacilities)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Automated Modules</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {calculateModulesForClassifications(getClinicClassifications(branch)).length} modules
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Linked Side Branches Count */}
                  <div className="mb-3 flex items-center justify-between text-xs py-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Linked Side Branches:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {linkedSideCount} {linkedSideCount === 1 ? 'side branch' : 'side branches'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusChangeClinic(branch);
                      setTargetStatus(branch.status === 'active' ? 'suspended' : 'active');
                      setStatusReason('');
                      setFormError('');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                  >
                    {branch.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewingMainBranchId(branch.id);
                      setViewingSideBranchId(null);
                    }}
                    className="text-xs rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 dark:text-slate-400">
          {filteredMainBranches.length === 0 ? (
            <span>Showing 0 of 0 main branches</span>
          ) : (
            <span>
              Showing {startIndex + 1}&ndash;{Math.min(startIndex + ITEMS_PER_PAGE, filteredMainBranches.length)} of {filteredMainBranches.length} main branches
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              className={`w-7 h-7 rounded text-xs font-medium cursor-pointer transition-colors ${
                currentPage === pageNum
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* REGISTER NEW CLINIC MODAL (Allows Main Branch or Side Branch) */}
      {isRegisterModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setIsRegisterModalOpen(false)}
          title="Register New Clinic / Branch"
          description="Register official branch details. Do not collect clinical, staffing, or financial details at this stage."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRegisterSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Registering...' : 'Register Clinic Branch'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            {/* Branch Hierarchy Selection */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <label className="block text-slate-800 dark:text-slate-200 font-semibold mb-1">
                Branch Hierarchy Type
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hierarchyType"
                    checked={isNewMainBranch}
                    onChange={() => setIsNewMainBranch(true)}
                    className="text-teal-600"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Main Branch</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hierarchyType"
                    checked={!isNewMainBranch}
                    onChange={() => setIsNewMainBranch(false)}
                    className="text-teal-600"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Side Branch</span>
                </label>
              </div>

              {!isNewMainBranch && (
                <div className="pt-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Select Parent Main Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedParentClinicId}
                    onChange={(e) => setSelectedParentClinicId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Choose Parent Main Branch --</option>
                    {mainBranches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Facility Classification for New Clinic */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 dark:text-slate-200 font-semibold">
                  Facility Classification <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  {calculateModulesForClassifications(newFacilityClassifications).length} modules automated
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select approved facility wings. Only OPD, IPD, and Lab are permitted.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {FACILITY_CLASSIFICATIONS.map((type) => {
                  const isChecked = newFacilityClassifications.includes(type);
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleNewClassification(type)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{type}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({FACILITY_TYPE_BUNDLES[type].shortCode})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Clinic / Branch Official Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Outpatient Healthcare Centre"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Unique Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APEX-PUN"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Branch Classification
                </label>
                <select
                  value={newBranchType}
                  onChange={(e) => setNewBranchType(e.target.value as BranchType)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="main_hospital">Main Hospital</option>
                  <option value="speciality_center">Speciality Center</option>
                  <option value="outpatient_clinic">Outpatient Clinic</option>
                  <option value="satellite_branch">Satellite Branch</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98220 00000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Official Contact Email
                </label>
                <input
                  type="email"
                  placeholder="admin@branch.local"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Primary Administrative Contact
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Kulkarni"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations Coordinator"
                  value={newContactDesignation}
                  onChange={(e) => setNewContactDesignation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-slate-700 dark:text-slate-300 font-medium">
                Physical Campus Address
              </label>
              <input
                type="text"
                placeholder="Plot / Street Address line"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City (e.g. Pune)"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="State (e.g. Maharashtra)"
                  value={newStateVal}
                  onChange={(e) => setNewStateVal(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="PIN / Postal Code"
                  value={newPostalCode}
                  onChange={(e) => setNewPostalCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Medical Registration Reference / License Number
              </label>
              <input
                type="text"
                placeholder="e.g. MED-REG-MH-2026-XXXX"
                value={newRegNumber}
                onChange={(e) => setNewRegNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* SHARED MODALS (Status Change, Facility Classification) */}
      {renderSharedModals()}
    </div>
  );
};
