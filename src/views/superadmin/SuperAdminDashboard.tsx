import React from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';

interface SuperAdminDashboardProps {
  onNavigate: (tab: string, subTab?: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const { clinics, agreements } = useSuperAdmin();

  // 1. Clinics & branches metrics: total locations and active locations
  const totalLocations = clinics.length;
  const activeLocations = clinics.filter((c) => c.status === 'active').length;

  // 2. Admin assignments metrics: locations with an appointed admin and locations that still need one
  const locationsWithAdmin = clinics.filter((c) => Boolean(c.appointedAdminId && c.appointedAdminName)).length;
  const locationsNeedingAdmin = clinics.filter((c) => !c.appointedAdminId || !c.appointedAdminName).length;

  // 3. Licence agreements metrics: active agreements, expiring soon, and expired
  const activeAgreements = agreements.filter((a) => a.status === 'active').length;
  const expiringAgreements = agreements.filter((a) => a.status === 'expiring_soon').length;
  const expiredAgreements = agreements.filter((a) => a.status === 'expired').length;

  return (
    <div className="space-y-6">
      <h1 className="text-[22px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
        Organisation overview
      </h1>

      {/* 3 Neutral KPI Cards: 1 row on desktop, stacked on narrow screens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Card 1: Clinics & branches */}
        <button
          type="button"
          onClick={() => onNavigate('super_clinics')}
          aria-label={`Clinics & branches: ${totalLocations} total locations, ${activeLocations} active locations. Open Clinics.`}
          className="text-left w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-2"
        >
          <div>
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Clinics & branches
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalLocations}</span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">total locations</span>
          </div>
          <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
            <span>Active locations</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{activeLocations}</span>
          </div>
        </button>

        {/* KPI Card 2: Admin assignments */}
        <button
          type="button"
          onClick={() => onNavigate('super_admins')}
          aria-label={`Admin assignments: ${locationsWithAdmin} locations with appointed admin, ${locationsNeedingAdmin} locations still need an admin. Open Admins.`}
          className="text-left w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-2"
        >
          <div>
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Admin assignments
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{locationsWithAdmin}</span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">with appointed admin</span>
          </div>
          <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
            <span>Still need admin</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{locationsNeedingAdmin} locations</span>
          </div>
        </button>

        {/* KPI Card 3: Licence agreements */}
        <button
          type="button"
          onClick={() => onNavigate('super_agreements')}
          aria-label={`Licence agreements: ${activeAgreements} active agreements, ${expiringAgreements} expiring soon, ${expiredAgreements} expired. Open Agreements.`}
          className="text-left w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-2"
        >
          <div>
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Licence agreements
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeAgreements}</span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">active agreements</span>
          </div>
          <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
            <span>Expiring soon: {expiringAgreements}</span>
            <span>Expired: {expiredAgreements}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
