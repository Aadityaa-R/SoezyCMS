import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { OnboardingChecklistItemKey, OnboardingProgressStatus } from '../../types/superAdmin';

export const BranchOnboarding: React.FC = () => {
  const {
    clinics,
    admins,
    agreements,
    onboarding,
    selectedClinicId,
    setSelectedClinicId,
    updateOnboardingChecklist,
    overrideOnboardingItem,
    activateClinicBranch,
    suspendClinicBranch,
  } = useSuperAdmin();

  // Active filter tab
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | OnboardingProgressStatus>('all');
  const [selectedClinic, setSelectedClinic] = useState<string>(
    selectedClinicId || (clinics.length > 0 ? clinics[0].id : '')
  );

  // Modals
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    clinicId: string;
    itemKey: OnboardingChecklistItemKey;
    itemTitle: string;
    reason: string;
  } | null>(null);

  const [activationModal, setActivationModal] = useState<{
    isOpen: boolean;
    clinicId: string;
    action: 'activate' | 'suspend';
    reason: string;
  } | null>(null);

  // Sync if selectedClinicId changes externally
  React.useEffect(() => {
    if (selectedClinicId && selectedClinicId !== selectedClinic) {
      setSelectedClinic(selectedClinicId);
    }
  }, [selectedClinicId]);

  // Checklist items for selected clinic
  const currentClinic = clinics.find(c => c.id === selectedClinic);
  const currentChecklist = onboarding.filter(item => item.clinicId === selectedClinic);

  const completedCount = currentChecklist.filter(item => item.completed || item.isOverridden).length;
  const totalCount = currentChecklist.length || 10;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);
  const allMandatorySatisfied = currentChecklist.length > 0 && currentChecklist.every(
    item => !item.isMandatory || item.completed || item.isOverridden
  );

  const currentAdmin = admins.find(a => a.clinicId === selectedClinic && a.status === 'active');
  const currentAgreement = agreements.find(a => a.clinicId === selectedClinic && a.status === 'active');

  // Filtered clinic list for selector
  const filteredClinics = useMemo(() => {
    if (activeStatusFilter === 'all') return clinics;
    return clinics.filter(c => c.onboardingStatus === activeStatusFilter);
  }, [clinics, activeStatusFilter]);

  const handleToggleChecklist = async (itemKey: OnboardingChecklistItemKey, currentCompleted: boolean) => {
    if (!selectedClinic) return;
    await updateOnboardingChecklist(selectedClinic, itemKey, !currentCompleted);
  };

  const handleOpenOverride = (itemKey: OnboardingChecklistItemKey, itemTitle: string) => {
    if (!selectedClinic) return;
    setOverrideModal({
      isOpen: true,
      clinicId: selectedClinic,
      itemKey,
      itemTitle,
      reason: '',
    });
  };

  const handleConfirmOverride = async () => {
    if (!overrideModal || !overrideModal.reason.trim()) return;
    await overrideOnboardingItem(overrideModal.clinicId, overrideModal.itemKey, overrideModal.reason);
    setOverrideModal(null);
  };

  const handleConfirmActivationAction = async () => {
    if (!activationModal) return;
    if (activationModal.action === 'activate') {
      await activateClinicBranch(activationModal.clinicId, activationModal.reason);
    } else {
      await suspendClinicBranch(activationModal.clinicId, activationModal.reason || 'Suspended via onboarding control');
    }
    setActivationModal(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Branch Onboarding & Activation</h1>

      {/* Global Pipeline Counts */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto [scrollbar-width:thin]">
        {(['all', 'pending', 'in_progress', 'ready_for_review', 'completed'] as const).map(tab => {
          const count = tab === 'all'
            ? clinics.length
            : clinics.filter(c => c.onboardingStatus === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeStatusFilter === tab
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.replace(/_/g, ' ').toUpperCase()} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout: Left Branch Picker, Right Detailed Checklist & Activation Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Branch Directory List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500">
            Select Clinic Branch
          </div>

          <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs divide-y divide-stone-100 max-h-[720px] overflow-y-auto">
            {filteredClinics.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500">
                No clinics found under &apos;{activeStatusFilter}&apos;.
              </div>
            ) : (
              filteredClinics.map(clinic => {
                const isSelected = clinic.id === selectedClinic;
                const checklist = onboarding.filter(i => i.clinicId === clinic.id);
                const done = checklist.filter(i => i.completed || i.isOverridden).length;
                const pct = Math.round((done / 10) * 100);

                return (
                  <button
                    key={clinic.id}
                    onClick={() => {
                      setSelectedClinic(clinic.id);
                      setSelectedClinicId(clinic.id);
                    }}
                    className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-stone-100/80 border-l-3 border-stone-900'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-stone-900 truncate">
                        {clinic.name}
                      </div>
                      <div className="font-mono text-[10px] text-stone-500 mt-0.5">
                        {clinic.code} Â· {clinic.branchType.toUpperCase()}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] capitalize text-slate-700 dark:text-slate-300">
                          {clinic.onboardingStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {done}/10 ({pct}%)
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${isSelected ? 'text-stone-900' : 'text-stone-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Clinic Checklist & Controls */}
        <div className="lg:col-span-8 space-y-5">
          {currentClinic ? (
            <>
              {/* Header Card for Selected Branch */}
              <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-stone-900">
                        {currentClinic.name}
                      </h2>
                      <span className="font-mono text-xs text-stone-500">[{currentClinic.code}]</span>
                      <span className="text-xs capitalize text-slate-700 dark:text-slate-300">
                        {currentClinic.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Type: <strong className="text-stone-900 font-medium">{currentClinic.branchType.toUpperCase()}</strong></span>
                      <span>Admin: <strong className="text-stone-900 font-medium">{currentAdmin ? currentAdmin.adminName : 'UNASSIGNED'}</strong></span>
                      <span>Agreement: <strong className="text-stone-900 font-medium">{currentAgreement ? currentAgreement.agreementReference : 'NONE'}</strong></span>
                    </div>
                  </div>

                  {/* Activation / Suspension Action Buttons */}
                  <div className="flex items-center gap-2">
                    {currentClinic.status === 'active' ? (
                      <button
                        onClick={() => setActivationModal({
                          isOpen: true,
                          clinicId: currentClinic.id,
                          action: 'suspend',
                          reason: '',
                        })}
                        className="h-9 !min-h-0 px-3.5 text-xs font-medium border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Suspend Branch</span>
                      </button>
                    ) : (
                      <button
                        disabled={!allMandatorySatisfied}
                        onClick={() => setActivationModal({
                          isOpen: true,
                          clinicId: currentClinic.id,
                          action: 'activate',
                          reason: '',
                        })}
                        className={`h-9 !min-h-0 px-3.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg transition-colors border shrink-0 ${
                          allMandatorySatisfied
                            ? 'bg-teal-600 text-white hover:bg-teal-700 border-transparent cursor-pointer shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                        }`}
                        title={
                          allMandatorySatisfied
                            ? 'All checklist items satisfied. Click to authorize branch go-live.'
                            : 'Complete all 10 checklist conditions or record authorized overrides to activate.'
                        }
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Authorize Go-Live & Activate</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Stat Bar */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-stone-700 font-semibold">
                      {completedCount} / {totalCount} Items Satisfied
                    </span>
                    <span className="text-stone-400 font-mono">({completionPercentage}%)</span>
                  </div>
                  {!allMandatorySatisfied && (
                    <span className="text-amber-700 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {totalCount - completedCount} pending items remaining
                    </span>
                  )}
                  {allMandatorySatisfied && (
                    <span className="text-teal-700 text-xs font-medium">
                      All verification criteria satisfied
                    </span>
                  )}
                </div>
              </div>

              {/* 10-Point Checklist */}
              <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 font-medium">
                    10-Point Onboarding Checklist
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Mandatory items require completion or authorized executive override
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {currentChecklist.map((item, idx) => {
                    const isPassed = item.completed || item.isOverridden;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isPassed ? 'bg-white' : 'bg-stone-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleChecklist(item.itemKey, item.completed)}
                            className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 border transition-colors ${
                              item.completed
                                ? 'border-teal-600 bg-teal-600 text-white'
                                : item.isOverridden
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-stone-300 bg-white hover:border-stone-500 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-stone-400">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className={`text-xs font-semibold ${isPassed ? 'text-stone-900' : 'text-stone-700'}`}>
                                {item.title}
                              </span>
                              {item.isMandatory && (
                                <span className="text-[10px] font-mono text-stone-400">
                                  [MANDATORY]
                                </span>
                              )}
                              {item.isOverridden && (
                                <span className="text-[10px] uppercase font-mono text-slate-600 dark:text-slate-400">
                                  OVERRIDDEN
                                </span>
                              )}
                            </div>

                            {item.isOverridden && item.overrideReason && (
                              <div className="text-[11px] text-stone-600 mt-1 pl-2 border-l-2 border-stone-300 font-mono">
                                Justification: {item.overrideReason}
                              </div>
                            )}

                            {item.completed && item.completedAt && (
                              <div className="text-[10px] text-stone-500 mt-0.5">
                                Verified on {item.completedAt} by {item.completedBy || 'Super Admin'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Checklist Action Buttons */}
                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <button
                            onClick={() => handleToggleChecklist(item.itemKey, item.completed)}
                            className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            {item.completed ? 'Mark Incomplete' : 'Mark Completed'}
                          </button>

                          {!item.completed && (
                            <button
                              onClick={() => handleOpenOverride(item.itemKey, item.title)}
                              className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                            >
                              {item.isOverridden ? 'Edit Override' : 'Issue Override'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="border border-stone-200 bg-white p-12 text-center text-xs text-stone-500">
              No branch selected. Select a clinic from the left directory to view onboarding status.
            </div>
          )}
        </div>
      </div>

      {/* OVERRIDE MODAL */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="text-xs font-mono text-stone-500 uppercase">Executive Governance</div>
                <h3 className="text-base font-semibold text-stone-900">
                  Issue Authorized Override
                </h3>
              </div>
              <button
                onClick={() => setOverrideModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Checklist Item: <strong className="text-stone-900">{overrideModal.itemTitle}</strong>
              </p>
              <div className="p-3 border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                An authorized override permits this mandatory onboarding condition to be bypassed for activation. This action will be permanently recorded in the immutable audit log with your administrative ID.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-700">
                Reason & Authorization Reference <span className="text-stone-400 font-normal">(mandatory)</span>
              </label>
              <textarea
                required
                rows={3}
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                placeholder="State the formal business justification, executive approval memo number, or interim SLA condition..."
                className="w-full p-2 text-xs border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!overrideModal.reason.trim()}
                onClick={handleConfirmOverride}
                className="px-3 py-1.5 text-xs bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                Confirm & Log Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATION / SUSPENSION MODAL */}
      {activationModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="text-xs font-mono text-stone-500 uppercase">Lifecycle Transition</div>
                <h3 className="text-base font-semibold text-stone-900">
                  {activationModal.action === 'activate' ? 'Authorize Branch Activation' : 'Suspend Branch Operations'}
                </h3>
              </div>
              <button
                onClick={() => setActivationModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Branch: <strong className="text-stone-900">{clinics.find(c => c.id === activationModal.clinicId)?.name}</strong>
              </p>
              {activationModal.action === 'activate' ? (
                <p>
                  Upon activation, this branch will be declared live. The appointed Clinic Admin will gain operational platform access according to their entitled facilities.
                </p>
              ) : (
                <div className="p-3 border border-red-200 bg-red-50 text-red-900 text-xs">
                  Suspending this branch will restrict clinic admin and staff access to administrative functions only. Clinical sessions will be halted.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-700">
                Administrative Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={activationModal.reason}
                onChange={(e) => setActivationModal({ ...activationModal, reason: e.target.value })}
                placeholder="Optional launch memo or suspension reasoning..."
                className="w-full p-2 text-xs border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setActivationModal(null)}
                className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmActivationAction}
                className={`px-3 py-1.5 text-xs text-white ${
                  activationModal.action === 'activate'
                    ? 'bg-stone-900 hover:bg-stone-800'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                {activationModal.action === 'activate' ? 'Confirm Go-Live Activation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
