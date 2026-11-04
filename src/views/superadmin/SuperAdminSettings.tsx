import React, { useState, useMemo } from 'react';
import {
  Search,
  Save,
  Check,
} from 'lucide-react';
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
      <div className="flex items-center gap-2">
        <div className="inline-flex border border-stone-200 p-0.5 bg-stone-100">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Organization Settings
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'audit_logs'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Immutable Audit Logs ({auditLogs.length})
          </button>
        </div>
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
              className="px-4 py-2 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Organization Settings
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

          {/* Audit Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Action:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
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
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Branch:</span>
                <select
                  value={clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
                >
                  <option value="all">All Branches</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search audit details or actor..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2.5 px-3 font-medium">Timestamp</th>
                    <th className="py-2.5 px-3 font-medium">Actor</th>
                    <th className="py-2.5 px-3 font-medium">Action</th>
                    <th className="py-2.5 px-3 font-medium">Target Entity</th>
                    <th className="py-2.5 px-3 font-medium">Reason & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-500 text-xs">
                        No audit records matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50/70">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-stone-900">{log.actorName}</div>
                          <div className="font-mono text-[10px] text-stone-400">{log.actorRole}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] text-stone-900 font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">
                          {log.targetName}
                          <span className="block font-mono text-[10px] text-stone-400">[{log.targetId}]</span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-700 leading-relaxed max-w-md">
                          {log.reason || 'â€”'}
                          {log.beforeValue && log.afterValue && (
                            <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                              {log.beforeValue} &rarr; {log.afterValue}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
