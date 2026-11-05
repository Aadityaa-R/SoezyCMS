import React, { useState, useMemo } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusDot } from '@/components/ui/Table';
import {
  Plus,
  Search,
  Download,
  ChevronDown,
} from 'lucide-react';
import {
  LicenceAgreementRecord,
  AgreementType,
} from '@/types/superAdmin';

interface AgreementManagementProps {
  onNavigateTab?: (tab: string, clinicId?: string) => void;
  initialSubTab?: string;
}

export const AgreementManagement: React.FC<AgreementManagementProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const {
    agreements,
    clinics,
    facilities,
    addAgreement,
    renewAgreement,
    terminateAgreement,
    selectedClinicId,
  } = useSuperAdmin();

  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'pending' | 'renewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<LicenceAgreementRecord | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<LicenceAgreementRecord | null>(null);
  const [selectedAgreementDetail, setSelectedAgreementDetail] = useState<LicenceAgreementRecord | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Agreement Form
  const [targetClinicId, setTargetClinicId] = useState(selectedClinicId || clinics[0]?.id || '');
  const [newReference, setNewReference] = useState('');
  const [newType, setNewType] = useState<AgreementType>('standard_saas');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [newSignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(['OPD', 'Pharmacy', 'Billing']);
  const [newDocName, setNewDocName] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  // Renew Agreement Form
  const [renewReference, setRenewReference] = useState('');
  const [renewType, setRenewType] = useState<AgreementType>('standard_saas');
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [renewEndDate, setRenewEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [renewDocName, setRenewDocName] = useState('');
  const [renewFacilities, setRenewFacilities] = useState<string[]>([]);
  const [renewRemarks, setRenewRemarks] = useState('');

  // Toggle facility in checkbox array
  const toggleFacilitySelection = (list: string[], setList: (val: string[]) => void, code: string) => {
    if (list.includes(code)) {
      setList(list.filter((c) => c !== code));
    } else {
      setList([...list, code]);
    }
  };

  // Filtered agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter((a) => {
      if (tabFilter === 'active' && a.status !== 'active') return false;
      if (tabFilter === 'expiring' && a.status !== 'expiring_soon') return false;
      if (tabFilter === 'expired' && a.status !== 'expired') return false;
      if (tabFilter === 'pending' && a.status !== 'pending_signature') return false;
      if (tabFilter === 'renewed' && a.status !== 'renewed' && a.status !== 'terminated') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = a.agreementReference.toLowerCase().includes(q);
        const matchClinic = a.clinicName.toLowerCase().includes(q);
        if (!matchRef && !matchClinic) return false;
      }

      return true;
    });
  }, [agreements, tabFilter, searchQuery]);

  // Handle Add Agreement Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClinicId || !newReference.trim() || !newStartDate || !newEndDate) {
      setFormError('Clinic, agreement reference number, and validity dates are mandatory.');
      return;
    }

    if (new Date(newEndDate) <= new Date(newStartDate)) {
      setFormError('Agreement end date cannot precede or equal start date.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await addAgreement({
      clinicId: targetClinicId,
      agreementReference: newReference.trim(),
      agreementType: newType,
      startDate: newStartDate,
      endDate: newEndDate,
      signedDate: newSignedDate,
      secureDocumentName: newDocName.trim() || `${newReference.trim().toUpperCase()}_Agreement.pdf`,
      coveredFacilities: selectedFacilities,
      remarks: newRemarks.trim(),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to add agreement.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsAddModalOpen(false);
    setNewReference('');
    setNewDocName('');
    setNewRemarks('');
  };

  // Open Renew Modal
  const openRenewModal = (agr: LicenceAgreementRecord) => {
    setRenewTarget(agr);
    setRenewReference(`${agr.agreementReference}-REN`);
    setRenewType(agr.agreementType);
    setRenewStartDate(new Date().toISOString().slice(0, 10));
    setRenewEndDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setRenewDocName(`${agr.agreementReference}_Renewal.pdf`);
    setRenewFacilities(agr.coveredFacilities);
    setRenewRemarks('');
    setFormError('');
  };

  // Handle Renew Submit
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTarget || !renewReference.trim()) {
      setFormError('New agreement reference is required.');
      return;
    }

    if (new Date(renewEndDate) <= new Date(renewStartDate)) {
      setFormError('Renewal end date cannot precede start date.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const res = await renewAgreement({
      previousAgreementId: renewTarget.id,
      newReference: renewReference.trim(),
      agreementType: renewType,
      startDate: renewStartDate,
      endDate: renewEndDate,
      secureDocumentName: renewDocName.trim() || `${renewReference.trim()}_Signed.pdf`,
      coveredFacilities: renewFacilities,
      remarks: renewRemarks.trim(),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to record renewal.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setRenewTarget(null);
  };

  // Handle Terminate Submit
  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateTarget) return;
    if (!terminateReason.trim()) {
      setFormError('An authorized legal/contractual reason is mandatory for termination.');
      return;
    }

    setIsSubmitting(true);
    await terminateAgreement(terminateTarget.id, terminateReason.trim());
    setIsSubmitting(false);
    setTerminateTarget(null);
    setTerminateReason('');
  };

  const agreementToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      {/* Search and filters on the left */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        {/* Status Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={tabFilter}
            onChange={(e) => setTabFilter(e.target.value as any)}
            className="appearance-none h-[36px] min-h-[36px] pl-3 pr-8 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="all">All statuses ({agreements.length})</option>
            <option value="active">Active ({agreements.filter((a) => a.status === 'active').length})</option>
            <option value="expiring">Expiring Soon ({agreements.filter((a) => a.status === 'expiring_soon').length})</option>
            <option value="pending">Pending Signature ({agreements.filter((a) => a.status === 'pending_signature').length})</option>
            <option value="expired">Expired ({agreements.filter((a) => a.status === 'expired').length})</option>
            <option value="renewed">Renewed / Terminated ({agreements.filter((a) => a.status === 'renewed' || a.status === 'terminated').length})</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Search Input - grows into available space */}
        <div className="relative flex-1 min-w-[180px] sm:min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reference, clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[36px] min-h-[36px] w-full pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            aria-label="Search licence agreements"
          />
        </div>
      </div>

      {/* Primary Action on the right, on the same row */}
      <button
        type="button"
        onClick={() => {
          setFormError('');
          setIsAddModalOpen(true);
        }}
        className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5 shrink-0" />
        <span>Add Agreement</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Licence Agreement Management</h1>

      {/* Main Agreements Table */}
      <Table toolbar={agreementToolbar} pinLeading={true}>
        <TableHeader>
          <TableRow>
            <TableHead pinned>Agreement Reference</TableHead>
            <TableHead>Associated Clinic</TableHead>
            <TableHead>Agreement Type</TableHead>
            <TableHead>Validity Window</TableHead>
            <TableHead>Facilities Covered</TableHead>
            <TableHead>Signed Document</TableHead>
            <TableHead>Agreement Status</TableHead>
            <TableHead isActions className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgreements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                No agreements match the selected filter.
              </TableCell>
            </TableRow>
          ) : (
            filteredAgreements.map((agr) => (
              <TableRow key={agr.id}>
                <TableCell pinned isPrimary>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {agr.agreementReference}
                  </span>
                  {agr.previousAgreementId && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                      (Renewed from {agr.previousAgreementId})
                    </span>
                  )}
                </TableCell>

                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                  {agr.clinicName}
                </TableCell>

                <TableCell className="capitalize text-slate-700 dark:text-slate-300">
                  {agr.agreementType.replace(/_/g, ' ')}
                </TableCell>

                <TableCell className="font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {agr.startDate} to {agr.endDate}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {agr.coveredFacilities.slice(0, 3).map((f) => (
                      <span key={f} className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        {f}
                      </span>
                    ))}
                    {agr.coveredFacilities.length > 3 && (
                      <span className="text-[10px] text-slate-400">
                        +{agr.coveredFacilities.length - 3} more
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {agr.secureDocumentName ? (
                    <span className="truncate max-w-[120px] inline-block text-slate-800 dark:text-slate-200">{agr.secureDocumentName}</span>
                  ) : (
                    <span className="text-slate-400 italic">No doc</span>
                  )}
                </TableCell>

                <TableCell>
                  <StatusDot status={agr.status} />
                </TableCell>

                <TableCell isActions className="text-right space-x-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setSelectedAgreementDetail(agr)}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                  >
                    Details
                  </button>
                  {(agr.status === 'active' || agr.status === 'expiring_soon') && (
                    <button
                      type="button"
                      onClick={() => openRenewModal(agr)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                    >
                      Renew
                    </button>
                  )}
                  {agr.status !== 'terminated' && agr.status !== 'renewed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTerminateTarget(agr);
                        setTerminateReason('');
                        setFormError('');
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Terminate
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* ADD AGREEMENT MODAL */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setIsAddModalOpen(false)}
          title="Add Licence Agreement"
          description="Register official SLA agreement terms and attach verified signed documentation."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Registering...' : 'Record Agreement'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Associated Clinic / Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetClinicId}
                  onChange={(e) => setTargetClinicId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Agreement Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AGR-2026-SUB-005"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Agreement Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AgreementType)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="standard_saas">Standard SaaS Agreement</option>
                  <option value="enterprise_network">Enterprise Network Master</option>
                  <option value="custom_sla">Custom SLA Contract</option>
                  <option value="pilot_trial">Pilot / Evaluation Trial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Expiry Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Contractually Covered Facility Modules
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                {facilities.map((fac) => (
                  <label key={fac.code} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFacilities.includes(fac.code)}
                      onChange={() => toggleFacilitySelection(selectedFacilities, setSelectedFacilities, fac.code)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{fac.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Signed Contract Document (PDF Reference)
              </label>
              <input
                type="text"
                placeholder="e.g. Master_Agreement_Signed_2026.pdf"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Administrative Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Contract notes, seats covered, SLA stipulations..."
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* RENEW AGREEMENT MODAL */}
      {renewTarget && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setRenewTarget(null)}
          title={`Renew Agreement: ${renewTarget.agreementReference}`}
          description="Record a contract renewal. Prior agreement version will be safely archived and linked for full audit continuity."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenewTarget(null)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRenewSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Recording Renewal...' : 'Confirm Agreement Renewal'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRenewSubmit} className="space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500">Prior Agreement:</span>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {renewTarget.agreementReference} ({renewTarget.clinicName})
              </div>
              <div className="text-[11px] text-slate-400">
                Validity: {renewTarget.startDate} to {renewTarget.endDate} &bull; Status will transition to &quot;Renewed&quot;.
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                New Renewal Reference <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={renewReference}
                onChange={(e) => setRenewReference(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  New Expiry Date
                </label>
                <input
                  type="date"
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                New Signed Document Reference
              </label>
              <input
                type="text"
                value={renewDocName}
                onChange={(e) => setRenewDocName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Renewal Remarks / Term Adjustments
              </label>
              <textarea
                rows={2}
                placeholder="Details of term extension, SLA adjustments..."
                value={renewRemarks}
                onChange={(e) => setRenewRemarks(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* TERMINATE AGREEMENT MODAL */}
      {terminateTarget && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setTerminateTarget(null)}
          title={`Terminate Agreement: ${terminateTarget.agreementReference}`}
          description="Terminate this licence agreement. Record will be preserved in historical audit archives."
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTerminateTarget(null)}
                disabled={isSubmitting}
                className="text-xs rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTerminateSubmit}
                disabled={isSubmitting}
                className="text-xs rounded bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? 'Terminating...' : 'Confirm Termination'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleTerminateSubmit} className="space-y-3 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Termination Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="State legal or operational cause for termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* AGREEMENT DETAIL MODAL */}
      {selectedAgreementDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAgreementDetail(null)}
          title={`Agreement Details: ${selectedAgreementDetail.agreementReference}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAgreementDetail(null)}
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
                <span className="text-slate-500 block text-[11px]">Associated Clinic</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAgreementDetail.clinicName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Contract Status</span>
                <span className="capitalize font-semibold text-slate-900 dark:text-slate-100">{selectedAgreementDetail.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Agreement Classification</span>
                <span className="capitalize text-slate-900 dark:text-slate-100">{selectedAgreementDetail.agreementType.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Validity Dates</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{selectedAgreementDetail.startDate} to {selectedAgreementDetail.endDate}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Covered Facility Entitlements:</span>
              <div className="flex flex-wrap gap-1">
                {selectedAgreementDetail.coveredFacilities.map((f) => (
                  <span key={f} className="text-[11px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {selectedAgreementDetail.secureDocumentName && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Signed Attachment:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {selectedAgreementDetail.secureDocumentName}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{selectedAgreementDetail.secureDocumentSize}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => alert(`Simulated secure download of ${selectedAgreementDetail.secureDocumentName}`)}
                  className="text-xs rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
              </div>
            )}

            {selectedAgreementDetail.remarks && (
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Administrative Remarks:</span>
                <div className="p-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {selectedAgreementDetail.remarks}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
