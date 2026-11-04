import React from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  UserCheck,
  FileText,
  Hospital,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigate: (tab: string, subTab?: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const {
    clinics,
    admins,
    agreements,
    facilities,
    auditLogs,
    alerts,
    setSelectedClinicId,
  } = useSuperAdmin();

  // Metrics computation
  const totalClinics = clinics.length;
  const activeClinics = clinics.filter((c) => c.status === 'active').length;
  const pendingClinics = clinics.filter((c) => c.status === 'pending_onboarding' || c.status === 'pending_activation').length;
  const inactiveClinics = clinics.filter((c) => c.status === 'inactive' || c.status === 'suspended').length;

  const clinicsWithoutAdmin = clinics.filter((c) => !c.appointedAdminId || !c.appointedAdminName);
  const activeAdmins = admins.filter((a) => a.status === 'active').length;

  const activeAgreements = agreements.filter((a) => a.status === 'active').length;
  const expiringAgreements = agreements.filter((a) => a.status === 'expiring_soon').length;
  const expiredAgreements = agreements.filter((a) => a.status === 'expired').length;

  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                Central Organisation Governance
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                SaaS Super Admin
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Organisation Overview & Administrative Operations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-branch registry, Clinic Administrator appointments, licence agreements, facility entitlements, and onboarding governance.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('super_reports')}
              className="text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Export Reports
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('super_clinics', 'register')}
              className="text-xs rounded bg-teal-600 hover:bg-teal-700 text-white"
            >
              Register Branch
            </Button>
          </div>
        </div>
      </div>

      {/* Primary 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Clinics */}
        <div
          onClick={() => onNavigate('super_clinics')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Clinics</span>
            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalClinics}</span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">{activeClinics} active</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>Pending: {pendingClinics}</span>
            <span>Inactive: {inactiveClinics}</span>
          </div>
        </div>

        {/* Metric 2: Clinic Admins */}
        <div
          onClick={() => onNavigate('super_admins')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Clinic Admins</span>
            <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeAdmins}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">appointed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>Missing Admin:</span>
            <span className={clinicsWithoutAdmin.length > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
              {clinicsWithoutAdmin.length} clinics
            </span>
          </div>
        </div>

        {/* Metric 3: Agreements */}
        <div
          onClick={() => onNavigate('super_agreements')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Licence Agreements</span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeAgreements}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">active contracts</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>Expiring: {expiringAgreements}</span>
            <span>Expired: {expiredAgreements}</span>
          </div>
        </div>

        {/* Metric 4: Onboarding */}
        <div
          onClick={() => onNavigate('super_onboarding')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Branch Onboarding</span>
            <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {clinics.filter((c) => c.onboardingStatus === 'completed').length} / {totalClinics}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>In Progress: {clinics.filter((c) => c.onboardingStatus === 'in_progress').length}</span>
            <span>Pending Review: {clinics.filter((c) => c.onboardingStatus === 'ready_for_review').length}</span>
          </div>
        </div>
      </div>

      {/* Actionable Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Actionable Administrative Alerts ({activeAlerts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('super_alerts')}
              className="text-xs text-amber-800 dark:text-amber-300 hover:underline font-medium cursor-pointer"
            >
              View All Alerts &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.targetId) setSelectedClinicId(alert.targetId);
                  onNavigate(alert.targetTab);
                }}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 p-3 rounded text-xs hover:border-amber-400 transition-colors cursor-pointer flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${
                      alert.severity === 'critical'
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{alert.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    {alert.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Section: Compact Clinic Status Table & Facility Adoption Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Compact Clinic Status Table */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Clinic / Branch Network Status
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Central registry status, appointed admin, and active facility count
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('super_clinics')}
              className="text-xs rounded border border-slate-200 dark:border-slate-700"
            >
              Full Directory
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase font-mono">
                  <th className="py-2 pr-3">Clinic / Branch</th>
                  <th className="py-2 px-3">Location</th>
                  <th className="py-2 px-3">Appointed Admin</th>
                  <th className="py-2 px-3">Facilities</th>
                  <th className="py-2 px-3">Agreement</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {clinics.map((clinic) => (
                  <tr
                    key={clinic.id}
                    onClick={() => {
                      setSelectedClinicId(clinic.id);
                      onNavigate('super_clinics');
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{clinic.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{clinic.code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {clinic.city}, {clinic.state}
                    </td>
                    <td className="py-2.5 px-3">
                      {clinic.appointedAdminName ? (
                        <div className="text-slate-900 dark:text-slate-100 font-medium">
                          {clinic.appointedAdminName}
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {clinic.enabledModules.length}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">wings</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        clinic.agreementStatus === 'active'
                          ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                          : clinic.agreementStatus === 'expiring_soon'
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {clinic.agreementStatus ? clinic.agreementStatus.replace('_', ' ') : 'None'}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        clinic.status === 'active'
                          ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                          : clinic.status === 'pending_onboarding'
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {clinic.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Facility Entitlement Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Facility Adoption
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clinics contractually entitled per module
              </p>
            </div>
            <Hospital className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {facilities.map((fac) => {
              const entitledCount = clinics.filter((c) => c.entitledFacilities.includes(fac.code)).length;
              return (
                <div key={fac.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{fac.name}</span>
                    <span className="ml-1.5 text-[10px] font-mono text-slate-400">({fac.shortCode})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{entitledCount}</span>
                    <span className="text-[11px] text-slate-400"> / {totalClinics} clinics</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('super_facilities')}
              className="w-full text-xs rounded border border-slate-200 dark:border-slate-700"
            >
              Manage Facility Entitlements
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Administrative Activity Audit Log */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Recent Administrative Audit Trail
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('super_settings', 'audit_logs')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
          >
            Full Audit Ledger &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{log.targetName}</span>
                {log.reason && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                    &bull; {log.reason}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
