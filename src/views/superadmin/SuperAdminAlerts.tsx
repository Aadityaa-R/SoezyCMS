import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Send,
  Plus,
  ArrowRight,
  X
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';

type AlertSeverity = 'critical' | 'warning' | 'info';

interface SuperAdminAlertsProps {
  onNavigateTab?: (tab: string, clinicId?: string) => void;
}

export const SuperAdminAlerts: React.FC<SuperAdminAlertsProps> = ({ onNavigateTab }) => {
  const {
    alerts,
    announcements,
    clinics,
    dismissAlert,
    createAnnouncement,
    setSelectedClinicId,
  } = useSuperAdmin();

  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'announcements'>('alerts');
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Announcement creation form state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    audience: 'all_clinics' as 'all_clinics' | 'clinic_admins_only' | 'selected_branches',
    priority: 'normal' as 'normal' | 'urgent',
  });

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, typeFilter]);

  const handleResolveAlert = (targetTab: string, clinicId?: string) => {
    if (clinicId) {
      setSelectedClinicId(clinicId);
    }
    if (onNavigateTab) {
      onNavigateTab(targetTab, clinicId);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;

    await createAnnouncement(
      announcementForm.title,
      announcementForm.content,
      announcementForm.audience,
      announcementForm.priority
    );

    setShowAnnouncementModal(false);
    setAnnouncementForm({
      title: '',
      content: '',
      audience: 'all_clinics',
      priority: 'normal',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
            Governance Communications & Action Center
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Notifications & Actionable Alerts
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Real-time compliance triggers, licence expiration warnings, unassigned branch alerts, and organization broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex border border-stone-200 p-0.5 bg-stone-100">
            <button
              onClick={() => setActiveSubTab('alerts')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'alerts'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Actionable Alerts ({alerts.filter(a => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setActiveSubTab('announcements')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSubTab === 'announcements'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Announcements ({announcements.length})
            </button>
          </div>

          {activeSubTab === 'announcements' && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 border border-stone-900"
            >
              <Plus className="w-3.5 h-3.5" />
              Publish Broadcast
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'alerts' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="warning">Warning Only</option>
                  <option value="info">Info Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
                >
                  <option value="all">All Trigger Types</option>
                  <option value="agreement_expiry">Licence Expiry</option>
                  <option value="admin_missing">Unassigned Branch</option>
                  <option value="onboarding_pending">Onboarding Blocked</option>
                  <option value="facility_mismatch">Entitlement Mismatch</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-stone-500 font-mono">
              Showing {filteredAlerts.length} actionable alerts
            </div>
          </div>

          {/* Alerts List */}
          <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs divide-y divide-stone-100">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                No active administrative alerts matching criteria. All systems operating within normal parameters.
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const clinic = clinics.find(c => c.id === alert.targetId);

                return (
                  <div
                    key={alert.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      alert.acknowledged ? 'opacity-50 bg-stone-50' : 'hover:bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {alert.severity === 'critical' ? (
                          <div className="p-1 border border-red-200 bg-red-50 text-red-700">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        ) : alert.severity === 'warning' ? (
                          <div className="p-1 border border-amber-200 bg-amber-50 text-amber-700">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 border border-stone-200 bg-stone-100 text-stone-700">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono border ${
                              alert.severity === 'critical'
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : alert.severity === 'warning'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-stone-200 bg-stone-50 text-stone-600'
                            }`}
                          >
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {alert.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {clinic && (
                            <span className="text-[11px] font-semibold text-stone-900">
                              Â· {clinic.name} <span className="font-mono text-stone-400">[{clinic.code}]</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-stone-900">
                          {alert.title}
                        </div>
                        <div className="text-xs text-stone-600">
                          {alert.description}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          Triggered on {alert.createdAt}
                        </div>
                      </div>
                    </div>

                    {/* Actionable Deep Links */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {alert.targetTab && (
                        <button
                          onClick={() => handleResolveAlert(alert.targetTab, alert.targetId)}
                          className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
                        >
                          Resolve Issue
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!alert.acknowledged && (
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="px-2.5 py-1.5 text-xs border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-400"
                          title="Acknowledge and dismiss alert"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Organization Announcements Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs p-3">
            <span className="text-xs text-stone-600">
              Platform-wide administrative bulletins transmitted to clinic administrators.
            </span>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              New Announcement
            </button>
          </div>

          <div className="border border-stone-200 bg-white rounded-xl overflow-hidden shadow-xs divide-y divide-stone-100">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No active announcements published.
              </div>
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className="p-4 space-y-2 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono border ${
                          ann.priority === 'urgent'
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}
                      >
                        {ann.priority.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-semibold text-stone-900">{ann.title}</h3>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400">
                      {ann.createdAt} Â· By {ann.createdBy}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {ann.content}
                  </p>

                  <div className="text-[11px] text-stone-500 font-mono pt-1">
                    Audience: {ann.audience.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <div className="text-xs font-mono text-stone-500 uppercase">Executive Communication</div>
                <h3 className="text-base font-semibold text-stone-900">
                  Publish Administrative Broadcast
                </h3>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Notice Headline</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. Mandatory Compliance Update: Clinical Data Backup Windows"
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Broadcast Details & Instructions</label>
                <textarea
                  required
                  rows={4}
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="Detail the administrative mandate, schedule, or policy update..."
                  className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Target Audience</label>
                  <select
                    value={announcementForm.audience}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, audience: e.target.value as any })}
                    className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                  >
                    <option value="all_clinics">All Clinics & Staff</option>
                    <option value="clinic_admins_only">Clinic Admins Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Priority Level</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                    className="w-full p-2 border border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                  >
                    <option value="normal">Normal Information</option>
                    <option value="urgent">Urgent Mandate</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs bg-stone-900 text-white hover:bg-stone-800 inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
