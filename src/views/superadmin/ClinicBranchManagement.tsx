import React, { useState, useMemo, useEffect } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

  // Inline facility classification state for viewing main branch
  const [mainBranchClassifications, setMainBranchClassifications] = useState<FacilityClassification[]>(['OPD']);
  const [isSavingMainClassification, setIsSavingMainClassification] = useState(false);
  const [mainBranchSaveError, setMainBranchSaveError] = useState('');
  const [mainBranchSaveFeedback, setMainBranchSaveFeedback] = useState<string | null>(null);

  // Inline facility classification state for viewing side branch
  const [sideBranchClassifications, setSideBranchClassifications] = useState<FacilityClassification[]>(['OPD']);
  const [isSavingSideClassification, setIsSavingSideClassification] = useState(false);
  const [sideBranchSaveError, setSideBranchSaveError] = useState('');
  const [sideBranchSaveFeedback, setSideBranchSaveFeedback] = useState<string | null>(null);

  const toggleMainClassification = (type: FacilityClassification) => {
    setMainBranchClassifications((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) {
          setMainBranchSaveError('At least one facility classification (OPD, IPD, or Lab) must remain selected.');
          return prev;
        }
        setMainBranchSaveError('');
        return prev.filter((t) => t !== type);
      } else {
        setMainBranchSaveError('');
        return [...prev, type];
      }
    });
  };

  const toggleSideClassification = (type: FacilityClassification) => {
    setSideBranchClassifications((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) {
          setSideBranchSaveError('At least one facility classification (OPD, IPD, or Lab) must remain selected.');
          return prev;
        }
        setSideBranchSaveError('');
        return prev.filter((t) => t !== type);
      } else {
        setSideBranchSaveError('');
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

  const handleSaveMainClassification = async () => {
    if (!viewingMainBranch) return;
    if (mainBranchClassifications.length === 0) {
      setMainBranchSaveError('Please select at least one facility classification.');
      return;
    }

    setIsSavingMainClassification(true);
    setMainBranchSaveError('');
    setMainBranchSaveFeedback(null);

    try {
      await updateClinicFacilityClassification(
        viewingMainBranch.id,
        mainBranchClassifications,
        `Updated facility classification to ${mainBranchClassifications.join(', ')}`
      );
      setMainBranchSaveFeedback('Classification saved successfully.');
    } catch (err: any) {
      setMainBranchSaveError(err?.message || 'Failed to update facility classification.');
    } finally {
      setIsSavingMainClassification(false);
    }
  };

  const handleSaveSideClassification = async () => {
    if (!viewingSideBranch) return;
    if (sideBranchClassifications.length === 0) {
      setSideBranchSaveError('Please select at least one facility classification.');
      return;
    }

    setIsSavingSideClassification(true);
    setSideBranchSaveError('');
    setSideBranchSaveFeedback(null);

    try {
      await updateClinicFacilityClassification(
        viewingSideBranch.id,
        sideBranchClassifications,
        `Updated facility classification to ${sideBranchClassifications.join(', ')}`
      );
      setSideBranchSaveFeedback('Classification saved successfully.');
    } catch (err: any) {
      setSideBranchSaveError(err?.message || 'Failed to update facility classification.');
    } finally {
      setIsSavingSideClassification(false);
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

  // Synchronize inline classification state when selecting or changing branch
  useEffect(() => {
    if (viewingMainBranch) {
      setMainBranchClassifications(getClinicClassifications(viewingMainBranch));
      setMainBranchSaveFeedback(null);
      setMainBranchSaveError('');
    }
  }, [viewingMainBranchId]);

  useEffect(() => {
    if (viewingSideBranch) {
      setSideBranchClassifications(getClinicClassifications(viewingSideBranch));
      setSideBranchSaveFeedback(null);
      setSideBranchSaveError('');
    }
  }, [viewingSideBranchId]);

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
        {/* Navigation Breadcrumb matching mockup */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              setViewingMainBranchId(null);
              setViewingSideBranchId(null);
            }}
            className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-medium"
          >
            Clinics
          </button>
          <span>/</span>
          {parentOfSideBranch && (
            <>
              <button
                type="button"
                onClick={() => setViewingSideBranchId(null)}
                className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-medium"
              >
                {parentOfSideBranch.name}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-slate-900 dark:text-slate-100 font-semibold">
            {viewingSideBranch.name}
          </span>
        </nav>

        {/* Page Heading & Status */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {viewingSideBranch.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Side branch &bull; {viewingSideBranch.code} &bull; {viewingSideBranch.city}, {viewingSideBranch.state}
              {parentOfSideBranch && ` &bull; Affiliated with ${parentOfSideBranch.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{viewingSideBranch.status.replace(/_/g, ' ')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusChangeClinic(viewingSideBranch);
                setTargetStatus(viewingSideBranch.status === 'active' ? 'suspended' : 'active');
                setStatusReason('');
                setFormError('');
              }}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors inline-flex items-center cursor-pointer"
            >
              {viewingSideBranch.status === 'active' ? 'Suspend Branch' : 'Activate Branch'}
            </button>
          </div>
        </div>

        {/* Card 1: Facility Classification matching approved mockup */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Facility Classification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the services offered at this location.
              </p>
            </div>
            <button
              type="button"
              disabled={isSavingSideClassification}
              onClick={handleSaveSideClassification}
              className="h-[36px] min-h-[36px] !min-h-0 px-4 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              {isSavingSideClassification ? 'Saving...' : 'Save classification'}
            </button>
          </div>

          {sideBranchSaveError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
              {sideBranchSaveError}
            </div>
          )}

          {sideBranchSaveFeedback && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-xs">
              {sideBranchSaveFeedback}
            </div>
          )}

          <div className="flex items-center gap-8 pt-1">
            {FACILITY_CLASSIFICATIONS.map((facType) => {
              const isChecked = sideBranchClassifications.includes(facType);
              return (
                <label key={facType} className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSideClassification(facType)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {facType}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Automatically enabled
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {sideBranchClassifications.map((t) => `${t} workflows and billing`).join(' • ') || 'None'}
            </span>
          </div>
        </div>

        {/* Section A: Side Branch Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Side Branch Administrative Details
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
              <span className="text-slate-500 block text-[11px]">Current Approved Classification</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatClassifications(viewingSideBranch.facilityClassifications || viewingSideBranch.optedFacilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Section C: Agreement Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Licence Agreement Details
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

        {/* Section E: Onboarding Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Branch Onboarding Details
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
              Administrative Activity & Audit Trail
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
        {/* Navigation Breadcrumb matching mockup */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              setViewingMainBranchId(null);
              setViewingSideBranchId(null);
            }}
            className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-medium"
          >
            Clinics
          </button>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">
            {viewingMainBranch.name}
          </span>
        </nav>

        {/* Page Heading & Status */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {viewingMainBranch.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Main branch &bull; {viewingMainBranch.code} &bull; {viewingMainBranch.city}, {viewingMainBranch.state}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{viewingMainBranch.status.replace(/_/g, ' ')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusChangeClinic(viewingMainBranch);
                setTargetStatus(viewingMainBranch.status === 'active' ? 'suspended' : 'active');
                setStatusReason('');
                setFormError('');
              }}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors inline-flex items-center cursor-pointer"
            >
              {viewingMainBranch.status === 'active' ? 'Suspend Main Branch' : 'Activate Main Branch'}
            </button>
          </div>
        </div>

        {/* Card 1: Facility Classification matching approved mockup */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Facility Classification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the services offered at this location.
              </p>
            </div>
            <button
              type="button"
              disabled={isSavingMainClassification}
              onClick={handleSaveMainClassification}
              className="h-[36px] min-h-[36px] !min-h-0 px-4 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              {isSavingMainClassification ? 'Saving...' : 'Save classification'}
            </button>
          </div>

          {mainBranchSaveError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
              {mainBranchSaveError}
            </div>
          )}

          {mainBranchSaveFeedback && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-xs">
              {mainBranchSaveFeedback}
            </div>
          )}

          <div className="flex items-center gap-8 pt-1">
            {FACILITY_CLASSIFICATIONS.map((facType) => {
              const isChecked = mainBranchClassifications.includes(facType);
              return (
                <label key={facType} className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMainClassification(facType)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {facType}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Automatically enabled
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {mainBranchClassifications.map((t) => `${t} workflows and billing`).join(' • ') || 'None'}
            </span>
          </div>
        </div>

        {/* Card 2: Side branches matching approved mockup */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Side branches
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Side branches grouped under {viewingMainBranch.name}
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500">
              {linkedSideBranches.length} {linkedSideBranches.length === 1 ? 'branch' : 'branches'}
            </span>
          </div>

          {linkedSideBranches.length === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              No side branches are currently linked to this main branch.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BRANCH</TableHead>
                  <TableHead>FACILITY TYPES</TableHead>
                  <TableHead>APPOINTED ADMIN</TableHead>
                  <TableHead isActions className="text-right">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedSideBranches.map((side) => {
                  const sideClassifications = getClinicClassifications(side);
                  return (
                    <TableRow key={side.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {side.name}
                      </TableCell>
                      <TableCell>
                        <span className="text-teal-700 dark:text-teal-300 font-medium">
                          {formatClassifications(sideClassifications)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-800 dark:text-slate-200">
                        {side.appointedAdminName || 'None Appointed'}
                      </TableCell>
                      <TableCell isActions className="text-right">
                        <button
                          type="button"
                          onClick={() => setViewingSideBranchId(side.id)}
                          className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline cursor-pointer"
                        >
                          View Details
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Section A: Main Branch Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Main Branch Administrative Details
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
              <span className="text-slate-500 block text-[11px]">Approved Facility Classification</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatClassifications(viewingMainBranch.facilityClassifications || viewingMainBranch.optedFacilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Section C: Agreement Details */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Licence Agreement Details
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

      {/* Standardized Toolbar: Search & filters on left, Primary action on right */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
        {/* Left: Search and Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Status Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={activeTabFilter}
              onChange={(e) => handleTabFilterChange(e.target.value as any)}
              className="appearance-none h-[36px] min-h-[36px] pl-3 pr-8 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="all">All statuses ({mainBranches.length})</option>
              <option value="active">Active ({mainBranches.filter((c) => c.status === 'active').length})</option>
              <option value="pending">Pending ({mainBranches.filter((c) => c.status === 'pending_onboarding' || c.status === 'pending_activation').length})</option>
              <option value="inactive">Inactive / Suspended ({mainBranches.filter((c) => c.status === 'inactive' || c.status === 'suspended').length})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Branch-Type Filter */}
          <div className="relative shrink-0">
            <select
              value={branchTypeFilter}
              onChange={(e) => handleBranchTypeChange(e.target.value)}
              className="appearance-none h-[36px] min-h-[36px] pl-3 pr-8 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              aria-label="Filter by branch type"
            >
              <option value="all">All Branch Types</option>
              <option value="main_hospital">Main Hospital</option>
              <option value="speciality_center">Speciality Center</option>
              <option value="outpatient_clinic">Outpatient Clinic</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input - grows into available space */}
          <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search main branches..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-[36px] min-h-[36px] w-full pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              aria-label="Search clinics"
            />
          </div>
        </div>

        {/* Right: Primary Action (36px, fits label) */}
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setIsRegisterModalOpen(true);
          }}
          className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Register Clinic</span>
        </button>
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
