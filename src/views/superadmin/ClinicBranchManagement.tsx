import React, { useState, useMemo } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  Search,
} from 'lucide-react';
import {
  ClinicAdministrativeProfile,
  ClinicOperationalStatus,
  BranchType,
  ClinicRegistrationParams,
} from '@/types/superAdmin';

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
    registerClinic,
    changeClinicStatus,
    selectedClinicId,
    setSelectedClinicId,
  } = useSuperAdmin();

  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState<string>('all');

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(initialSubTab === 'register');
  const [statusChangeClinic, setStatusChangeClinic] = useState<ClinicAdministrativeProfile | null>(null);
  const [targetStatus, setTargetStatus] = useState<ClinicOperationalStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New clinic form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBranchType, setNewBranchType] = useState<BranchType>('outpatient_clinic');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newStateVal, setNewStateVal] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');

  // Selected clinic profile for consolidated drawer view
  const activeProfile = useMemo(() => {
    if (!selectedClinicId) return null;
    return clinics.find((c) => c.id === selectedClinicId) || null;
  }, [selectedClinicId, clinics]);

  // Filtering
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
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
  }, [clinics, activeTabFilter, branchTypeFilter, searchQuery]);

  // Handle register clinic submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      setFormError('Clinic name and unique branch code are required.');
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
      };

      const created = await registerClinic(params);
      setIsRegisterModalOpen(false);
      setSelectedClinicId(created.id);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Clinic / Branch Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Central registry of all branches, administrative profiles, licensing records, and facility entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setFormError('');
              setIsRegisterModalOpen(true);
            }}
            className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Clinic</span>
          </Button>
        </div>
      </div>

      {/* Directory Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 pb-2 sm:pb-0 overflow-x-auto">
          {[
            { id: 'all', label: `All Clinics (${clinics.length})` },
            { id: 'active', label: `Active (${clinics.filter((c) => c.status === 'active').length})` },
            { id: 'pending', label: `Pending (${clinics.filter((c) => c.status === 'pending_onboarding' || c.status === 'pending_activation').length})` },
            { id: 'inactive', label: `Inactive / Suspended (${clinics.filter((c) => c.status === 'inactive' || c.status === 'suspended').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabFilter(tab.id as any)}
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
              placeholder="Search by name, code, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-52 sm:w-64 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <select
            value={branchTypeFilter}
            onChange={(e) => setBranchTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Branch Types</option>
            <option value="main_hospital">Main Hospital</option>
            <option value="speciality_center">Speciality Center</option>
            <option value="outpatient_clinic">Outpatient Clinic</option>
            <option value="satellite_branch">Satellite Branch</option>
          </select>
        </div>
      </div>

      {/* Main Clinic Directory Table */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Clinic / Branch Name</th>
                <th className="py-2.5 px-3">Branch Type</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Appointed Admin</th>
                <th className="py-2.5 px-3">Agreement</th>
                <th className="py-2.5 px-3">Facilities</th>
                <th className="py-2.5 px-3">Onboarding</th>
                <th className="py-2.5 px-3">Branch Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No clinics match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => (
                  <tr
                    key={clinic.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {clinic.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {clinic.code} &bull; {clinic.registrationNumber}
                      </div>
                    </td>

                    <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">
                      {clinic.branchType.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {clinic.city}, {clinic.state}
                    </td>

                    <td className="py-3 px-3">
                      {clinic.appointedAdminName ? (
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {clinic.appointedAdminName}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {clinic.appointedAdminEmail}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClinicId(clinic.id);
                            onNavigate('super_admins');
                          }}
                          className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                        >
                          + Appoint Admin
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs capitalize text-slate-700 dark:text-slate-300">
                      {clinic.agreementStatus ? clinic.agreementStatus.replace(/_/g, ' ') : 'None'}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {clinic.enabledModules.length}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">modules</span>
                    </td>

                    <td className="py-3 px-3 text-xs capitalize text-slate-700 dark:text-slate-300">
                      {clinic.onboardingStatus.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-3 text-xs capitalize text-slate-700 dark:text-slate-300">
                      {clinic.status.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedClinicId(clinic.id)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusChangeClinic(clinic);
                          setTargetStatus(clinic.status === 'active' ? 'suspended' : 'active');
                          setStatusReason('');
                          setFormError('');
                        }}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                      >
                        {clinic.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONSOLIDATED CLINIC PROFILE MODAL / DRAWER (Section 6 of prompt) */}
      {activeProfile && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClinicId(null)}
          title={`Consolidated Administrative Profile: ${activeProfile.name}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500 font-mono">
                Branch ID: {activeProfile.id} &bull; Created {new Date(activeProfile.createdAt).toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClinicId(null)}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Close Profile
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Section 1: Basic Information */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Basic Official Information & Campus
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Clinic Code</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{activeProfile.code}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Branch Type</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{activeProfile.branchType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Registration / License Ref</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{activeProfile.registrationNumber}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[11px]">Campus Physical Address</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {activeProfile.address}, {activeProfile.city}, {activeProfile.state} - {activeProfile.postalCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Official Contact</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{activeProfile.phone}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Appointed Administrator */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Appointed Clinic Administrator
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClinicId(activeProfile.id);
                    onNavigate('super_admins');
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Manage Assignment &rarr;
                </button>
              </div>

              {activeProfile.appointedAdminName ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Admin Full Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{activeProfile.appointedAdminName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Designation</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{activeProfile.appointedAdminDesignation || 'Administrator'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Official Email</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{activeProfile.appointedAdminEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Effective Appointment Date</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{activeProfile.adminAssignmentDate || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-slate-500 italic">
                  No Clinic Administrator has been appointed for this branch yet.
                </div>
              )}
            </div>

            {/* Section 3: Agreement Summary */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Licence Agreement Summary
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClinicId(activeProfile.id);
                    onNavigate('super_agreements');
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  View Agreement Details &rarr;
                </button>
              </div>

              {activeProfile.agreementReference ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Agreement Reference</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{activeProfile.agreementReference}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Status</span>
                    <span className="capitalize font-semibold text-slate-900 dark:text-slate-100">{activeProfile.agreementStatus}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Validity Window</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {activeProfile.agreementStartDate} to {activeProfile.agreementEndDate}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-slate-500 italic">
                  No active licence agreement attached to this clinic.
                </div>
              )}
            </div>

            {/* Section 4: Facility Entitlements */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Facility Entitlements & CMS Modules
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClinicId(activeProfile.id);
                    onNavigate('super_facilities');
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Configure Facilities &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Opted Facilities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.optedFacilities.map((f) => (
                      <span key={f} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Contractually Entitled:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.entitledFacilities.map((f) => (
                      <span key={f} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">CMS Modules Enabled:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.enabledModules.map((f) => (
                      <span key={f} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Onboarding & Status History */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Onboarding & Branch Status History
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClinicId(activeProfile.id);
                    onNavigate('super_onboarding');
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Review Onboarding Checklist &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Status</span>
                  <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{activeProfile.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Onboarding Stage</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{activeProfile.onboardingStatus.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Activation Date</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{activeProfile.activationDate || 'Pending'}</span>
                </div>
                {activeProfile.statusReason && (
                  <div className="sm:col-span-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Status Reason & Administrative Directives</span>
                    <span className="text-slate-800 dark:text-slate-200">{activeProfile.statusReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* REGISTER NEW CLINIC MODAL */}
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

      {/* CHANGE CLINIC STATUS MODAL */}
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
    </div>
  );
};
