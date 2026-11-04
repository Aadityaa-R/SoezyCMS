import React, { useState, useMemo } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  Search,
} from 'lucide-react';
import {
  AdminAssignmentRecord,
  AdminAccountStatus,
} from '@/types/superAdmin';

interface AdminManagementProps {
  onNavigateTab?: (tab: string, clinicId?: string) => void;
  initialSubTab?: string;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const {
    admins,
    clinics,
    appointAdmin,
    reassignAdmin,
    toggleAdminStatus,
    selectedClinicId,
  } = useSuperAdmin();

  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAppointModalOpen, setIsAppointModalOpen] = useState(false);
  const [reassigningClinicId, setReassigningClinicId] = useState<string | null>(null);
  const [selectedAdminDetail, setSelectedAdminDetail] = useState<AdminAssignmentRecord | null>(null);
  const [statusModalAdmin, setStatusModalAdmin] = useState<AdminAssignmentRecord | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [targetAccountStatus, setTargetAccountStatus] = useState<AdminAccountStatus>('active');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appoint Admin Form
  const [appointClinicId, setAppointClinicId] = useState(selectedClinicId || clinics[0]?.id || '');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('Lead Clinic Administrator');
  const [adminEffectiveDate, setAdminEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [adminNotes, setAdminNotes] = useState('');

  // Reassignment Form
  const [reassignName, setReassignName] = useState('');
  const [reassignEmail, setReassignEmail] = useState('');
  const [reassignPhone, setReassignPhone] = useState('');
  const [reassignDesignation, setReassignDesignation] = useState('Clinic Administrator');
  const [reassignDate, setReassignDate] = useState(new Date().toISOString().slice(0, 10));
  const [reassignReason, setReassignReason] = useState('');

  // Clinics without an admin
  const unassignedClinics = useMemo(() => {
    return clinics.filter((c) => !c.appointedAdminId || !c.appointedAdminName);
  }, [clinics]);

  // Filtering
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (tabFilter === 'active' && a.status !== 'active') return false;
      if (tabFilter === 'inactive' && a.status !== 'deactivated' && a.status !== 'reassigned') return false;
      if (tabFilter === 'pending' && a.status !== 'pending_invitation') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.adminName.toLowerCase().includes(q);
        const matchEmail = a.adminEmail.toLowerCase().includes(q);
        const matchClinic = a.clinicName.toLowerCase().includes(q);
        const matchDesignation = a.designation.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchClinic && !matchDesignation) return false;
      }

      return true;
    });
  }, [admins, tabFilter, searchQuery]);

  // Submit Appoint
  const handleAppointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointClinicId || !adminName.trim() || !adminEmail.trim()) {
      setFormError('Clinic, administrator full name, and official email are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await appointAdmin({
      clinicId: appointClinicId,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim().toLowerCase(),
      adminPhone: adminPhone.trim() || undefined,
      designation: adminDesignation.trim(),
      effectiveDate: adminEffectiveDate,
      notes: adminNotes.trim(),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to appoint administrator.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsAppointModalOpen(false);
    setAdminName('');
    setAdminEmail('');
    setAdminPhone('');
    setAdminNotes('');
  };

  // Submit Reassign
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningClinicId || !reassignName.trim() || !reassignEmail.trim()) {
      setFormError('Replacement administrator full name and official email are required.');
      return;
    }
    if (!reassignReason.trim()) {
      setFormError('An authorized administrative reason is mandatory for reassignment.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await reassignAdmin({
      clinicId: reassigningClinicId,
      newAdminName: reassignName.trim(),
      newAdminEmail: reassignEmail.trim().toLowerCase(),
      newAdminPhone: reassignPhone.trim() || undefined,
      newDesignation: reassignDesignation.trim(),
      effectiveDate: reassignDate,
      reason: reassignReason.trim(),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to reassign administrator.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setReassigningClinicId(null);
    setReassignName('');
    setReassignEmail('');
    setReassignPhone('');
    setReassignReason('');
  };

  // Submit Status Change
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalAdmin) return;
    if (!statusReason.trim()) {
      setFormError('An authorized reason is required for administrator account status modification.');
      return;
    }

    setIsSubmitting(true);
    await toggleAdminStatus(statusModalAdmin.id, targetAccountStatus, statusReason.trim());
    setIsSubmitting(false);
    setStatusModalAdmin(null);
    setStatusReason('');
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Clinic Administrator Governance</h1>

      {/* Directory Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 pb-2 sm:pb-0 overflow-x-auto">
          {[
            { id: 'all', label: `All Admins (${admins.length})` },
            { id: 'active', label: `Active (${admins.filter((a) => a.status === 'active').length})` },
            { id: 'unassigned', label: `Unassigned Clinics (${unassignedClinics.length})` },
            { id: 'pending', label: `Pending Invitations (${admins.filter((a) => a.status === 'pending_invitation').length})` },
            { id: 'inactive', label: `Reassigned / Inactive (${admins.filter((a) => a.status === 'reassigned' || a.status === 'deactivated').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                tabFilter === tab.id
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by admin name, email, clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-56 sm:w-64 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setFormError('');
              setIsAppointModalOpen(true);
            }}
            className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Appoint Admin</span>
          </Button>
        </div>
      </div>

      {/* Unassigned Clinics Notice Card (If tabFilter is unassigned) */}
      {tabFilter === 'unassigned' ? (
        <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 p-5 rounded space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Clinics Without Appointed Administrator ({unassignedClinics.length})
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            According to organizational compliance policy, an appointed Clinic Administrator is mandatory before a branch can be activated.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassignedClinics.map((clinic) => (
              <div
                key={clinic.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{clinic.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {clinic.code} &bull; {clinic.city}, {clinic.state}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAppointClinicId(clinic.id);
                    setIsAppointModalOpen(true);
                  }}
                  className="text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  Appoint Admin
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Main Admins Table */
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Administrator Name</th>
                  <th className="py-2.5 px-3">Official Email</th>
                  <th className="py-2.5 px-3">Contact Phone</th>
                  <th className="py-2.5 px-3">Assigned Clinic / Branch</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3">Appointment Date</th>
                  <th className="py-2.5 px-3">Assignment Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      No administrators match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr
                      key={admin.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {admin.adminName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block">
                          {admin.adminUserId}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {admin.adminEmail}
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {admin.adminPhone || 'N/A'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {admin.clinicName}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {admin.clinicCode}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {admin.designation}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {admin.effectiveFrom}
                        {admin.effectiveTo && (
                          <span className="text-[10px] text-slate-400 block">to {admin.effectiveTo}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs capitalize text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-emerald-500' : admin.status === 'pending_invitation' ? 'bg-amber-500' : 'bg-rose-500'} shrink-0`} />
                          {admin.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedAdminDetail(admin)}
                          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                        >
                          Profile
                        </button>
                        {admin.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReassigningClinicId(admin.clinicId);
                              setReassignReason('');
                              setFormError('');
                            }}
                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                          >
                            Reassign
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setStatusModalAdmin(admin);
                            setTargetAccountStatus(admin.status === 'active' ? 'deactivated' : 'active');
                            setStatusReason('');
                            setFormError('');
                          }}
                          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                        >
                          {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPOINT NEW ADMIN MODAL */}
      {isAppointModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setIsAppointModalOpen(false)}
          title="Appoint Clinic Administrator"
          description="Appoint the official Clinic Administrator for a registered branch. Never create or expose plaintext credentials."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAppointModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAppointSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Recording Appointment...' : 'Confirm Appointment'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAppointSubmit} className="space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Assigned Clinic / Branch <span className="text-rose-500">*</span>
              </label>
              <select
                value={appointClinicId}
                onChange={(e) => setAppointClinicId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.appointedAdminName ? `[Current: ${c.appointedAdminName}]` : '[Unassigned]'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Administrator Personal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Krishnan"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@clinic.local"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  placeholder="Lead Clinic Administrator"
                  value={adminDesignation}
                  onChange={(e) => setAdminDesignation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98220 11223"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Effective Appointment Date
              </label>
              <input
                type="date"
                value={adminEffectiveDate}
                onChange={(e) => setAdminEffectiveDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Administrative Notes / Directives
              </label>
              <textarea
                rows={2}
                placeholder="Optional governance notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* REASSIGN ADMIN MODAL */}
      {reassigningClinicId && (() => {
        const targetClinic = clinics.find((c) => c.id === reassigningClinicId);
        return (
          <Modal
            isOpen={true}
            onClose={() => !isSubmitting && setReassigningClinicId(null)}
            title={`Reassign Administrator: ${targetClinic?.name}`}
            description="Appoint a replacement Clinic Administrator. The previous administrator's assignment will be archived in the security ledger."
            maxWidth="md"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReassigningClinicId(null)}
                  disabled={isSubmitting}
                  className="text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleReassignSubmit}
                  disabled={isSubmitting}
                  className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? 'Recording Reassignment...' : 'Confirm Reassignment'}
                </Button>
              </div>
            }
          >
            <form onSubmit={handleReassignSubmit} className="space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                  {formError}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] text-slate-500">Current Assigned Administrator:</span>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {targetClinic?.appointedAdminName} ({targetClinic?.appointedAdminEmail})
                </div>
                <div className="text-[11px] text-slate-400">
                  Status will transition to &quot;Reassigned&quot; upon replacement confirmation.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Replacement Admin Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={reassignName}
                    onChange={(e) => setReassignName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Replacement Admin Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@clinic.local"
                    value={reassignEmail}
                    onChange={(e) => setReassignEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={reassignDesignation}
                    onChange={(e) => setReassignDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Effective Transition Date
                  </label>
                  <input
                    type="date"
                    value={reassignDate}
                    onChange={(e) => setReassignDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Reassignment Reason / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Record mandatory operational reason for replacement..."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* ADMIN ACCOUNT STATUS MODAL */}
      {statusModalAdmin && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setStatusModalAdmin(null)}
          title={`Administrator Account Control: ${statusModalAdmin.adminName}`}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalAdmin(null)}
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
                {isSubmitting ? 'Updating...' : 'Confirm Account Action'}
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
                Account Access State
              </label>
              <select
                value={targetAccountStatus}
                onChange={(e) => setTargetAccountStatus(e.target.value as AdminAccountStatus)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="active">Active (Access Authorized)</option>
                <option value="deactivated">Deactivated (Suspended Access)</option>
                <option value="pending_invitation">Pending Invitation / Reset</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Reason / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Operational justification for audit ledger..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ADMIN DETAIL MODAL */}
      {selectedAdminDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAdminDetail(null)}
          title={`Administrator Profile: ${selectedAdminDetail.adminName}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAdminDetail(null)}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500 block text-[11px]">Designation</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAdminDetail.designation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Assignment Status</span>
                <span className="capitalize font-semibold text-slate-900 dark:text-slate-100">{selectedAdminDetail.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Official Email</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{selectedAdminDetail.adminEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Contact Phone</span>
                <span className="text-slate-900 dark:text-slate-100">{selectedAdminDetail.adminPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Assigned Clinic</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedAdminDetail.clinicName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Appointment Date</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{selectedAdminDetail.effectiveFrom}</span>
              </div>
            </div>

            {selectedAdminDetail.notes && (
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Appointment Notes:</span>
                <div className="p-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {selectedAdminDetail.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
