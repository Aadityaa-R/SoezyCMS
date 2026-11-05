import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusDot } from '@/components/ui/Table';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { FacilityCatalogueRecord, ClinicFacilityEntitlementRecord } from '../../types/superAdmin';

export const FacilityManagement: React.FC = () => {
  const {
    clinics,
    agreements,
    facilities,
    selectedClinicId,
    setSelectedClinicId,
    addFacilityToCatalogue,
    updateFacilityCatalogue,
    updateClinicFacilityEntitlement,
  } = useSuperAdmin();

  // Active view: 'matrix' | 'catalogue'
  const [activeTab, setActiveTab] = useState<'matrix' | 'catalogue'>('matrix');

  // Matrix filters
  const [filterClinicId, setFilterClinicId] = useState<string>(selectedClinicId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'opted' | 'entitled' | 'enabled' | 'configured'>('all');

  // Compute 4-state entitlement records for all clinics and facilities
  const clinicEntitlements: ClinicFacilityEntitlementRecord[] = useMemo(() => {
    const list: ClinicFacilityEntitlementRecord[] = [];
    clinics.forEach(c => {
      facilities.forEach(f => {
        const opted = (c.optedFacilities || []).includes(f.code);
        const entitled = (c.entitledFacilities || []).includes(f.code);
        const enabled = (c.enabledModules || []).includes(f.code);
        list.push({
          id: `ent-${c.id}-${f.code}`,
          clinicId: c.id,
          facilityCode: f.code,
          facilityName: f.name,
          optedStatus: opted,
          entitlementStatus: entitled,
          moduleEnabledStatus: enabled,
          operationallyConfigured: enabled,
          effectiveFrom: c.createdAt,
          agreementReference: c.agreementReference,
          updatedAt: c.updatedAt,
        });
      });
    });
    return list;
  }, [clinics, facilities]);

  // Modals
  const [showAddCatalogueModal, setShowAddCatalogueModal] = useState(false);
  const [editingCatalogueItem, setEditingCatalogueItem] = useState<FacilityCatalogueRecord | null>(null);
  const [entitlementModalState, setEntitlementModalState] = useState<{
    isOpen: boolean;
    clinicId: string;
    facilityCode: string;
    currentOpted: boolean;
    currentEntitled: boolean;
    currentEnabled: boolean;
    targetField: 'optedStatus' | 'entitlementStatus' | 'moduleEnabledStatus';
    targetValue: boolean;
    reason: string;
  } | null>(null);

  // Sync selectedClinicId if it changes from external navigation
  React.useEffect(() => {
    if (selectedClinicId && selectedClinicId !== filterClinicId) {
      setFilterClinicId(selectedClinicId);
    }
  }, [selectedClinicId]);

  // Handlers for Catalogue Form
  const [catalogueFormData, setCatalogueFormData] = useState({
    code: '',
    name: '',
    shortCode: '',
    description: '',
    relatedModuleKey: '',
    status: 'active' as 'active' | 'inactive',
  });

  const handleOpenAddCatalogue = () => {
    setCatalogueFormData({
      code: '',
      name: '',
      shortCode: '',
      description: '',
      relatedModuleKey: '',
      status: 'active',
    });
    setEditingCatalogueItem(null);
    setShowAddCatalogueModal(true);
  };

  const handleOpenEditCatalogue = (item: FacilityCatalogueRecord) => {
    setCatalogueFormData({
      code: item.code,
      name: item.name,
      shortCode: item.shortCode,
      description: item.description,
      relatedModuleKey: item.relatedModuleKey,
      status: item.status,
    });
    setEditingCatalogueItem(item);
    setShowAddCatalogueModal(true);
  };

  const handleSaveCatalogue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogueFormData.code || !catalogueFormData.name) return;

    if (editingCatalogueItem) {
      await updateFacilityCatalogue(editingCatalogueItem.id, catalogueFormData);
    } else {
      await addFacilityToCatalogue(catalogueFormData);
    }
    setShowAddCatalogueModal(false);
  };

  // Group entitlements for active clinic or all clinics
  const displayedEntitlements = useMemo(() => {
    return clinicEntitlements.filter(e => {
      if (filterClinicId !== 'all' && e.clinicId !== filterClinicId) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = e.facilityName.toLowerCase().includes(query);
        const matchesCode = e.facilityCode.toLowerCase().includes(query);
        const clinic = clinics.find(c => c.id === e.clinicId);
        const matchesClinic = clinic?.name.toLowerCase().includes(query) || clinic?.code.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesClinic) return false;
      }

      if (filterState === 'opted' && !e.optedStatus) return false;
      if (filterState === 'entitled' && !e.entitlementStatus) return false;
      if (filterState === 'enabled' && !e.moduleEnabledStatus) return false;
      if (filterState === 'configured' && !e.operationallyConfigured) return false;

      return true;
    });
  }, [clinicEntitlements, filterClinicId, searchQuery, filterState, clinics]);

  // Helper to open toggle modal with safety guard
  const handleInitiateToggle = (
    entitlement: ClinicFacilityEntitlementRecord,
    targetField: 'optedStatus' | 'entitlementStatus' | 'moduleEnabledStatus'
  ) => {
    const currentValue = entitlement[targetField];
    const targetValue = !currentValue;

    setEntitlementModalState({
      isOpen: true,
      clinicId: entitlement.clinicId,
      facilityCode: entitlement.facilityCode,
      currentOpted: entitlement.optedStatus,
      currentEntitled: entitlement.entitlementStatus,
      currentEnabled: entitlement.moduleEnabledStatus,
      targetField,
      targetValue,
      reason: '',
    });
  };

  const handleConfirmToggle = async () => {
    if (!entitlementModalState) return;
    const { clinicId, facilityCode, targetField, targetValue, reason } = entitlementModalState;

    const updates: { optedStatus?: boolean; entitlementStatus?: boolean; moduleEnabledStatus?: boolean } = {};
    updates[targetField] = targetValue;

    await updateClinicFacilityEntitlement(clinicId, facilityCode, updates, reason || 'Administrative status change');
    setEntitlementModalState(null);
  };

  const activeClinic = clinics.find(c => c.id === filterClinicId);
  const activeAgreement = agreements.find(a => a.clinicId === filterClinicId && a.status === 'active');

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Facility Entitlement Management</h1>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex border border-stone-200 p-0.5 bg-stone-100">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'matrix'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Assignment Matrix
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'catalogue'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Platform Catalogue ({facilities.length})
          </button>
        </div>

        {activeTab === 'catalogue' && (
          <button
            onClick={handleOpenAddCatalogue}
            className="px-3.5 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 border border-stone-900"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Facility
          </button>
        )}
      </div>

      {/* Explanatory 4-State Architectural Callout */}
      <div className="border border-stone-200 bg-stone-50 p-4">
        <div>
          <div className="text-xs text-stone-700 leading-relaxed">
            <span className="font-semibold text-stone-900 block mb-1">
              Strict 4-State Healthcare Governance Model:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2 text-stone-600">
              <div className="border-l-2 border-stone-300 pl-2">
                <span className="font-medium text-stone-900 block">1. Opted For</span>
                Clinic requested or expressed interest during intake.
              </div>
              <div className="border-l-2 border-amber-400 pl-2">
                <span className="font-medium text-stone-900 block">2. Contractually Entitled</span>
                Formally covered in active verified Licence Agreement.
              </div>
              <div className="border-l-2 border-teal-500 pl-2">
                <span className="font-medium text-stone-900 block">3. CMS Module Enabled</span>
                Active interface access granted to clinic staff by Super Admin.
              </div>
              <div className="border-l-2 border-blue-400 pl-2">
                <span className="font-medium text-stone-900 block">4. Operationally Configured</span>
                Rosters, beds, or inventory configured locally by Clinic Admin.
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Clinic Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Branch:</span>
                <select
                  value={filterClinicId}
                  onChange={(e) => {
                    setFilterClinicId(e.target.value);
                    if (e.target.value !== 'all') {
                      setSelectedClinicId(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 font-mono focus:outline-none focus:border-stone-500"
                >
                  <option value="all">All Clinics ({clinics.length})</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* State Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">State:</span>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
                >
                  <option value="all">All States</option>
                  <option value="opted">Opted For Only</option>
                  <option value="entitled">Contractually Entitled Only</option>
                  <option value="enabled">CMS Enabled Only</option>
                  <option value="configured">Operationally Configured Only</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search facility name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>

          {/* Active Clinic Info Banner if single clinic is selected */}
          {activeClinic && (
            <div className="border border-stone-200 bg-white p-3 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
              <div>
                <span className="font-semibold text-stone-900">{activeClinic.name}</span>
                <span className="text-stone-500 font-mono ml-2">[{activeClinic.code}]</span>
                <span className="text-stone-500 ml-2">Type: {activeClinic.branchType.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-3 text-stone-600">
                <span>
                  Active Agreement: <span className="font-mono text-stone-900">{activeAgreement ? activeAgreement.agreementReference : 'None Found'}</span>
                </span>
                {activeAgreement && (
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    Valid to {activeAgreement.endDate}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Entitlement Matrix Table */}
          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                {filterClinicId === 'all' && <TableHead pinned>Clinic</TableHead>}
                <TableHead pinned={filterClinicId !== 'all'}>Facility</TableHead>
                <TableHead className="text-center">1. Opted For</TableHead>
                <TableHead className="text-center">2. Contractually Entitled</TableHead>
                <TableHead className="text-center">3. CMS Module Enabled</TableHead>
                <TableHead className="text-center">4. Op. Configured</TableHead>
                <TableHead>Agreement Ref</TableHead>
                <TableHead isActions className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEntitlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={filterClinicId === 'all' ? 8 : 7} className="py-8 text-center text-slate-500 text-xs">
                    No facility entitlements matching current criteria.
                  </TableCell>
                </TableRow>
              ) : (
                displayedEntitlements.map(e => {
                  const clinic = clinics.find(c => c.id === e.clinicId);
                  const isUnentitledEnabled = e.moduleEnabledStatus && !e.entitlementStatus;

                  return (
                    <TableRow key={e.id}>
                      {filterClinicId === 'all' && (
                        <TableCell pinned isPrimary>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{clinic?.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{clinic?.code}</div>
                        </TableCell>
                      )}

                      <TableCell pinned={filterClinicId !== 'all'} isPrimary={filterClinicId !== 'all'}>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{e.facilityName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{e.facilityCode}</div>
                      </TableCell>

                      {/* 1. Opted */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleInitiateToggle(e, 'optedStatus')}
                          title="Click to toggle Opted status"
                          className="text-xs text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                        >
                          {e.optedStatus ? 'Yes' : 'No'}
                        </button>
                      </TableCell>

                      {/* 2. Contractually Entitled */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleInitiateToggle(e, 'entitlementStatus')}
                          title="Click to toggle Entitlement status"
                          className="text-xs text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                        >
                          {e.entitlementStatus ? 'Yes' : 'No'}
                        </button>
                      </TableCell>

                      {/* 3. Module Enabled */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => handleInitiateToggle(e, 'moduleEnabledStatus')}
                            title="Click to toggle CMS module access"
                            className="text-xs text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                          >
                            {e.moduleEnabledStatus ? 'Yes' : 'No'}
                          </button>
                          {isUnentitledEnabled && (
                            <span title="Warning: Enabled without contractual entitlement!" className="text-slate-500 text-[10px] italic">
                              (unentitled)
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 4. Operationally Configured */}
                      <TableCell className="text-center text-xs text-slate-700 dark:text-slate-300">
                        {e.operationallyConfigured ? 'Yes' : 'No'}
                      </TableCell>

                      {/* Agreement Ref */}
                      <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {e.agreementReference || '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell isActions className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {e.moduleEnabledStatus ? (
                            <button
                              onClick={() => handleInitiateToggle(e, 'moduleEnabledStatus')}
                              className="text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer"
                            >
                              Disable Module
                            </button>
                          ) : (
                            <button
                              onClick={() => handleInitiateToggle(e, 'moduleEnabledStatus')}
                              className="text-[11px] font-mono text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                            >
                              Enable Module
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Catalogue Management Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-stone-200 p-3">
            <span className="text-xs text-stone-600">
              Platform-wide facility catalogue definitions. These represent all modular wings supported across the enterprise health system.
            </span>
            <button
              onClick={handleOpenAddCatalogue}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Facility Definition
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Code</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Related Module</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead isActions className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map(item => (
                <TableRow key={item.id}>
                  <TableCell pinned isPrimary className="font-mono font-semibold text-slate-900 dark:text-slate-100">{item.code}</TableCell>
                  <TableCell className="font-mono text-slate-600 dark:text-slate-400">{item.shortCode}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                  <TableCell className="font-mono text-slate-500 text-[11px]">{item.relatedModuleKey}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.description}>
                    {item.description}
                  </TableCell>
                  <TableCell>
                    <StatusDot status={item.status} />
                  </TableCell>
                  <TableCell isActions className="text-right">
                    <button
                      onClick={() => handleOpenEditCatalogue(item)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                      title="Edit facility catalogue definition"
                    >
                      Edit
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* MODAL 1: Toggle State Confirmation with Reason and Guardrail */}
      {entitlementModalState && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="text-xs font-mono text-stone-500 uppercase">State Change Confirmation</div>
                <h3 className="text-base font-semibold text-stone-900">
                  Update Facility State
                </h3>
              </div>
              <button
                onClick={() => setEntitlementModalState(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-stone-600">
              <p>
                Target Clinic: <span className="font-semibold text-stone-900">{clinics.find(c => c.id === entitlementModalState.clinicId)?.name}</span>
              </p>
              <p>
                Facility: <span className="font-mono font-semibold text-stone-900">{entitlementModalState.facilityCode}</span>
              </p>
              <p>
                Action: Changing{' '}
                <span className="font-medium text-stone-900">
                  {entitlementModalState.targetField === 'optedStatus'
                    ? '1. Opted Status'
                    : entitlementModalState.targetField === 'entitlementStatus'
                    ? '2. Contractual Entitlement'
                    : '3. CMS Module Enabled'}
                </span>{' '}
                to <span className="font-mono font-semibold text-stone-900">{entitlementModalState.targetValue ? 'TRUE' : 'FALSE'}</span>.
              </p>

              {/* Guardrail Warning */}
              {entitlementModalState.targetField === 'moduleEnabledStatus' &&
                entitlementModalState.targetValue === true &&
                !entitlementModalState.currentEntitled && (
                  <div className="p-3 border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Regulatory Guardrail Warning</span>
                      This facility is NOT currently covered under the branch&apos;s active Licence Agreement. Enabling clinical CMS access without contractual entitlement is logged as an authorized administrative exception.
                    </div>
                  </div>
                )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-700">
                Administrative Reason / Reference <span className="text-stone-400 font-normal">(required for audit trail)</span>
              </label>
              <textarea
                value={entitlementModalState.reason}
                onChange={(e) => setEntitlementModalState({ ...entitlementModalState, reason: e.target.value })}
                placeholder="State the administrative justification, e.g. signed SLA amendment dated..."
                rows={2}
                className="w-full p-2 text-xs border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEntitlementModalState(null)}
                className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className="px-3 py-1.5 text-xs bg-stone-900 text-white hover:bg-stone-800"
              >
                Confirm State Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Catalogue Item */}
      {showAddCatalogueModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="text-xs font-mono text-stone-500 uppercase">Platform Catalogue</div>
                <h3 className="text-base font-semibold text-stone-900">
                  {editingCatalogueItem ? 'Edit Facility Definition' : 'Add New Platform Facility'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddCatalogueModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogue} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Facility Code (Uppercase ID)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCatalogueItem}
                  value={catalogueFormData.code}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. DIALYSIS, AMBULANCE"
                  className="w-full p-2 border border-stone-200 bg-white font-mono uppercase focus:outline-none focus:border-stone-500 disabled:bg-stone-100"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  value={catalogueFormData.shortCode}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, shortCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. DIA, AMB"
                  className="w-full p-2 border border-stone-200 bg-white font-mono uppercase focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={catalogueFormData.name}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, name: e.target.value })}
                  placeholder="e.g. Dialysis Unit, Ambulance Services"
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Related CMS Module Key</label>
                <input
                  type="text"
                  required
                  value={catalogueFormData.relatedModuleKey}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, relatedModuleKey: e.target.value })}
                  placeholder="e.g. module_dialysis, module_ambulance"
                  className="w-full p-2 border border-stone-200 bg-white font-mono focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catalogueFormData.description}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, description: e.target.value })}
                  placeholder="Standard operational purpose of this clinical wing..."
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Platform Status</label>
                <select
                  value={catalogueFormData.status}
                  onChange={(e) => setCatalogueFormData({ ...catalogueFormData, status: e.target.value as any })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                >
                  <option value="active">Active (Available across organization)</option>
                  <option value="inactive">Inactive (Deprecated / Hidden)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddCatalogueModal(false)}
                  className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs bg-stone-900 text-white hover:bg-stone-800"
                >
                  {editingCatalogueItem ? 'Save Changes' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
