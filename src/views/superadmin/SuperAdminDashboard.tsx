import React, { useState, useMemo } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Search, ChevronDown } from 'lucide-react';
import {
  formatClassifications,
  getClinicClassifications,
  FACILITY_TYPE_BUNDLES,
  FacilityClassification,
} from '@/lib/facilityClassifications';

interface SuperAdminDashboardProps {
  onNavigate: (tab: string, subTab?: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const {
    clinics,
    admins,
    agreements,
    auditLogs,
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

  // Table Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (statusFilter === 'inactive' && c.status !== 'inactive' && c.status !== 'suspended') return false;
      if (statusFilter === 'pending' && !c.status.includes('pending')) return false;

      if (facilityFilter !== 'all') {
        const classifications = getClinicClassifications(c);
        if (!classifications.map((t) => t.toLowerCase()).includes(facilityFilter.toLowerCase())) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesCity = c.city.toLowerCase().includes(q);
        const matchesState = c.state.toLowerCase().includes(q);
        const matchesAdmin = c.appointedAdminName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCity && !matchesState && !matchesAdmin) {
          return false;
        }
      }

      return true;
    });
  }, [clinics, statusFilter, facilityFilter, searchQuery]);

  const renderStatusIndicator = (status: string) => {
    const s = status.toLowerCase();
    let dotColor = 'bg-slate-400';
    if (s === 'active' || s === 'completed') {
      dotColor = 'bg-emerald-500';
    } else if (s.includes('pending') || s.includes('progress') || s.includes('soon')) {
      dotColor = 'bg-amber-500';
    } else if (s.includes('suspend') || s.includes('inactive') || s.includes('expired')) {
      dotColor = 'bg-rose-500';
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 capitalize">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
        <span>{status.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  const tableToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none h-8 pl-3 pr-8 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Facility Filter */}
        <div className="relative">
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="appearance-none h-8 pl-3 pr-8 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by facility"
          >
            <option value="all">All facilities</option>
            <option value="OPD">OPD</option>
            <option value="IPD">IPD</option>
            <option value="Lab">Lab</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clinics or branches"
          className="h-8 w-full pl-8 pr-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          aria-label="Search clinics or branches"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Organisation Overview & Administrative Operations</h1>

      {/* Primary 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Clinics */}
        <div
          onClick={() => onNavigate('super_clinics')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Clinics</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalClinics}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activeClinics} active</span>
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
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Clinic Admins</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeAdmins}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">appointed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>Missing Admin:</span>
            <span className="text-slate-500 font-medium">{clinicsWithoutAdmin.length} clinics</span>
          </div>
        </div>

        {/* Metric 3: Agreements */}
        <div
          onClick={() => onNavigate('super_agreements')}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Licence Agreements</span>
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
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Branch Onboarding</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {clinics.filter((c) => c.onboardingStatus === 'completed').length} / {totalClinics}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
            <span>In Progress: {clinics.filter((c) => c.onboardingStatus === 'in_progress').length}</span>
            <span>Pending Review: {clinics.filter((c) => c.onboardingStatus === 'ready_for_review').length}</span>
          </div>
        </div>
      </div>

      {/* Clinic / Branch Network Status Full-Width Card (Approved Mockup Layout) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              CLINIC / BRANCH NETWORK STATUS
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Central registry status, appointed admin, and active facility count
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('super_clinics')}
            className="text-xs rounded border border-slate-200 dark:border-slate-700 font-medium"
          >
            Full Directory
          </Button>
        </div>

        <Table toolbar={tableToolbar} pinLeading={true}>
          <TableHeader>
            <TableRow>
              <TableHead pinned>CLINIC / BRANCH</TableHead>
              <TableHead>LOCATION</TableHead>
              <TableHead>APPOINTED ADMIN</TableHead>
              <TableHead>FACILITIES</TableHead>
              <TableHead>AGREEMENT</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClinics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No clinics match the current filter or search criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredClinics.map((clinic) => (
                <TableRow
                  key={clinic.id}
                  onClick={() => {
                    setSelectedClinicId(clinic.id);
                    onNavigate('super_clinics');
                  }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <TableCell pinned isPrimary>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{clinic.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{clinic.code}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-700 dark:text-slate-300">
                      {clinic.city}, {clinic.state}
                    </span>
                  </TableCell>
                  <TableCell>
                    {clinic.appointedAdminName ? (
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {clinic.appointedAdminName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatClassifications(getClinicClassifications(clinic))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {renderStatusIndicator(clinic.agreementStatus || 'active')}
                  </TableCell>
                  <TableCell>
                    {renderStatusIndicator(clinic.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 2-Column Section: Facility Adoption Overview & Recent Administrative Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Facility Classification Overview */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Facility Adoption
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Locations classified per approved facility type
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(['OPD', 'IPD', 'Lab'] as FacilityClassification[]).map((facType) => {
              const bundle = FACILITY_TYPE_BUNDLES[facType];
              const count = clinics.filter((c) => getClinicClassifications(c).includes(facType)).length;
              return (
                <div key={facType} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bundle.name}</span>
                    <span className="ml-1.5 text-[10px] font-mono text-slate-400">({facType})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{count}</span>
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
              onClick={() => onNavigate('super_clinics')}
              className="w-full text-xs rounded border border-slate-200 dark:border-slate-700 font-medium"
            >
              Manage Clinic Classifications
            </Button>
          </div>
        </div>

        {/* Right Col: Recent Administrative Activity Audit Log */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
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
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase">
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
    </div>
  );
};
