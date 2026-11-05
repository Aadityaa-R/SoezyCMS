import React, { useState, useMemo } from 'react';
import {
  Search,
  Save,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { SuperAdminAuditAction, PlatformOrganizationSettings } from '../../types/superAdmin';

export const SuperAdminSettings: React.FC = () => {
  const { settings, updateSettings, auditLogs, clinics } = useSuperAdmin();

  // Tabs: 'settings' | 'audit_logs'
  const [activeTab, setActiveTab] = useState<'settings' | 'audit_logs'>('settings');

  // Form state
  const [formData, setFormData] = useState<PlatformOrganizationSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  // Audit filters
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | SuperAdminAuditAction>('all');
  const [clinicFilter, setClinicFilter] = useState<string>('all');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (clinicFilter !== 'all' && log.targetId !== clinicFilter) return false;

      if (auditSearch) {
        const query = auditSearch.toLowerCase();
        const matchesReason = (log.reason || '').toLowerCase().includes(query);
        const matchesActor = log.actorName.toLowerCase().includes(query);
        const matchesTarget = (log.targetName || '').toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        if (!matchesReason && !matchesActor && !matchesTarget && !matchesAction) return false;
      }

      return true;
    });
  }, [auditLogs, actionFilter, clinicFilter, auditSearch]);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Platform Settings & Immutable Audit Logs</h1>

      {/* Settings / Audit Logs Switcher */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto [scrollbar-width:thin]">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Organization Settings
        </button>
        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'audit_logs'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* Section 1: Organization Identity */}
          <div className="border border-stone-200 bg-white p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900">1. Healthcare Organization Identity</h3>
              <p className="text-xs text-stone-500">Legal corporate details governing all clinic branches.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Legal Organization Name</label>
                <input
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Enterprise Code</label>
                <input
                  type="text"
                  required
                  disabled
                  value={formData.organizationCode}
                  className="w-full p-2 border border-stone-200 bg-stone-100 text-stone-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Headquarters Address</label>
                <input
                  type="text"
                  value={formData.headquartersAddress}
                  onChange={(e) => setFormData({ ...formData, headquartersAddress: e.target.value })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Official Support Email</label>
                <input
                  type="email"
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Official Phone</label>
                <input
                  type="text"
                  value={formData.officialPhone}
                  onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Official Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Expiration Notice Thresholds */}
          <div className="border border-stone-200 bg-white p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900">2. Agreement Expiration Warning Thresholds</h3>
              <p className="text-xs text-stone-500">Notice days configured in descending urgency.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">First Notice Window (Days)</label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={formData.reminderNoticeDays[0] || 60}
                  onChange={(e) => {
                    const days = [...formData.reminderNoticeDays];
                    days[0] = Number(e.target.value);
                    setFormData({ ...formData, reminderNoticeDays: days });
                  }}
                  className="w-full p-2 border border-stone-200 bg-white font-mono focus:outline-none focus:border-stone-500 text-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Standard advance notice</span>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Second Notice Window (Days)</label>
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={formData.reminderNoticeDays[1] || 30}
                  onChange={(e) => {
                    const days = [...formData.reminderNoticeDays];
                    days[1] = Number(e.target.value);
                    setFormData({ ...formData, reminderNoticeDays: days });
                  }}
                  className="w-full p-2 border border-stone-200 bg-white font-mono focus:outline-none focus:border-stone-500 text-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Heightened renewal urgency</span>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Final Urgent Notice (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={formData.reminderNoticeDays[2] || 7}
                  onChange={(e) => {
                    const days = [...formData.reminderNoticeDays];
                    days[2] = Number(e.target.value);
                    setFormData({ ...formData, reminderNoticeDays: days });
                  }}
                  className="w-full p-2 border border-stone-200 bg-white font-mono focus:outline-none focus:border-stone-500 text-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Critical escalation</span>
              </div>
            </div>
          </div>

          {/* Section 3: Governance Policies */}
          <div className="border border-stone-200 bg-white p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900">3. Governance & Audit Guardrails</h3>
              <p className="text-xs text-stone-500">Security enforcement and prerequisite requirements.</p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireAdminBeforeActivation}
                  onChange={(e) => setFormData({ ...formData, requireAdminBeforeActivation: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-stone-900 block">Require Appointed Admin Before Branch Activation</span>
                  <span className="text-stone-500">Enforces that a primary administrator must be assigned and verified before branch go-live.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireSignedAgreementBeforeActivation}
                  onChange={(e) => setFormData({ ...formData, requireSignedAgreementBeforeActivation: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-stone-900 block">Require Signed Agreement Before Activation</span>
                  <span className="text-stone-500">Enforces an active verified licence agreement before clinical modules can be enabled.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="h-9 !min-h-0 px-4 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Organization Settings</span>
            </button>
            {isSaved && (
              <span className="text-xs text-teal-700 font-mono inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Settings saved successfully
              </span>
            )}
          </div>
        </form>
      ) : (
        /* IMMUTABLE AUDIT LOGS TAB */
        <div className="space-y-4">
          <div className="border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-700">
            <div>
              <span className="font-semibold text-stone-900 block">Immutable Security Audit Trail</span>
              Every Super Admin action (branch registration, admin appointment, agreement modification, entitlement change, override, activation) is permanently logged with actor credentials, timestamp, and justification. Records cannot be altered or deleted.
            </div>
          </div>

          <Table
            pinLeading={true}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value as any)}
                      className="appearance-none h-9 pl-3 pr-8 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      aria-label="Filter by action type"
                    >
                      <option value="all">All Action Types</option>
                      <option value="clinic_created">Clinic Created</option>
                      <option value="clinic_status_changed">Clinic Status Changed</option>
                      <option value="admin_appointed">Admin Appointed</option>
                      <option value="admin_reassigned">Admin Reassigned</option>
                      <option value="agreement_created">Agreement Created</option>
                      <option value="agreement_renewed">Agreement Renewed</option>
                      <option value="facility_entitlement_changed">Facility Entitlement Changed</option>
                      <option value="onboarding_override">Onboarding Override</option>
                      <option value="branch_activated">Branch Activated</option>
                      <option value="branch_suspended">Branch Suspended</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative shrink-0">
                    <select
                      value={clinicFilter}
                      onChange={(e) => setClinicFilter(e.target.value)}
                      className="appearance-none h-9 pl-3 pr-8 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      aria-label="Filter by branch"
                    >
                      <option value="all">All Branches</option>
                      {clinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search audit details or actor..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="h-9 w-full pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      aria-label="Search audit logs"
                    />
                  </div>
                </div>
              </div>
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead pinned>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Reason & Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No audit records matching query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAuditLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell pinned isPrimary className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{log.actorName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{log.actorRole}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100 font-semibold">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {log.targetName}
                      <span className="block font-mono text-[10px] text-slate-400">[{log.targetId}]</span>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">
                      {log.reason || '—'}
                      {log.beforeValue && log.afterValue && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {log.beforeValue} &rarr; {log.afterValue}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
