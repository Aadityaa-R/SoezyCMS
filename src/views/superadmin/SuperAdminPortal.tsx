import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Layers,
  ClipboardCheck,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { SuperAdminProvider, useSuperAdmin } from '../../context/SuperAdminContext';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { ClinicBranchManagement } from './ClinicBranchManagement';
import { AdminManagement } from './AdminManagement';
import { AgreementManagement } from './AgreementManagement';
import { FacilityManagement } from './FacilityManagement';
import { BranchOnboarding } from './BranchOnboarding';
import { SuperAdminReports } from './SuperAdminReports';
import { SuperAdminAlerts } from './SuperAdminAlerts';
import { SuperAdminSettings } from './SuperAdminSettings';

interface SuperAdminPortalProps {
  initialTab?: string;
  onNavigateGlobal?: (tab: string, subTab?: string) => void;
}

const SuperAdminPortalContent: React.FC<{
  initialTab?: string;
  onNavigateGlobal?: (tab: string, subTab?: string) => void;
}> = ({ initialTab = 'super_dashboard', onNavigateGlobal }) => {
  const { clinics, agreements, alerts, setSelectedClinicId } = useSuperAdmin();

  // Map incoming tab or internal tab
  const normalizeTab = (tab: string) => {
    if (tab === 'organizations' || tab === 'dashboard') return 'super_dashboard';
    return tab;
  };

  const [currentTab, setCurrentTab] = useState<string>(normalizeTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setCurrentTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  const handleTabSelect = (tabKey: string, clinicId?: string) => {
    setCurrentTab(tabKey);
    if (clinicId) {
      setSelectedClinicId(clinicId);
    }
    if (onNavigateGlobal) {
      onNavigateGlobal(tabKey);
    }
  };

  // Nav Items definition for Super Admin
  const navTabs = [
    { id: 'super_dashboard', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'super_clinics', label: 'Clinic Directory', icon: Building2 },
    { id: 'super_admins', label: 'Admin Accounts', icon: Users },
    { id: 'super_agreements', label: 'Licence Agreements', icon: ShieldCheck },
    { id: 'super_facilities', label: 'Facility Entitlements', icon: Layers },
    { id: 'super_onboarding', label: 'Branch Onboarding', icon: ClipboardCheck },
    { id: 'super_reports', label: 'Reports', icon: BarChart3 },
    { id: 'super_alerts', label: 'Alerts', icon: Bell, badge: alerts.filter(a => !a.acknowledged).length },
    { id: 'super_settings', label: 'Platform Settings', icon: Settings },
  ];

  const activeClinicsCount = clinics.filter(c => c.status === 'active').length;
  const pendingOnboardingCount = clinics.filter(c => c.onboardingStatus !== 'completed').length;
  const expiringAgreementsCount = agreements.filter(a => a.status === 'expiring_soon').length;

  return (
    <div className="w-full min-h-screen bg-[#fafafa] text-stone-900 font-sans pb-16">
      {/* Top Organization Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <img
                src="/soezy-logo.png"
                alt="SOEZY"
                className="h-8 w-auto object-contain shrink-0"
                onError={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-stone-900 tracking-tight">
                    SOEZY CMS Platform
                  </span>
                  <span className="border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-mono text-teal-800 rounded-xs">
                    PLATFORM SUPER ADMIN
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  SaaS Healthcare Service Provider • Multi-Tenant Client Licencing & Governance
                </div>
              </div>
            </div>

            {/* Quick Administrative KPI Breadcrumb */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-teal-600 rounded-none inline-block" />
                <span className="text-stone-500">Live Client Branches:</span>
                <span className="font-semibold text-stone-900">{activeClinicsCount} / {clinics.length}</span>
              </div>

              {pendingOnboardingCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-500 rounded-none inline-block" />
                  <span className="text-stone-500">Onboarding:</span>
                  <span className="font-semibold text-stone-900">{pendingOnboardingCount}</span>
                </div>
              )}

              {expiringAgreementsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-rose-500 rounded-none inline-block" />
                  <span className="text-stone-500">Agreements Expiring:</span>
                  <span className="font-semibold text-rose-700">{expiringAgreementsCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5 text-xs -mb-px">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap inline-flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'border-teal-600 text-teal-800 font-semibold bg-teal-50/40'
                      : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="border border-rose-300 bg-rose-50 text-rose-800 px-1 py-0.2 text-[9px] font-mono">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'super_dashboard' && (
          <SuperAdminDashboard onNavigate={handleTabSelect} />
        )}
        {currentTab === 'super_clinics' && (
          <ClinicBranchManagement onNavigate={handleTabSelect} />
        )}
        {currentTab === 'super_admins' && (
          <AdminManagement onNavigateTab={handleTabSelect} />
        )}
        {currentTab === 'super_agreements' && (
          <AgreementManagement onNavigateTab={handleTabSelect} />
        )}
        {currentTab === 'super_facilities' && (
          <FacilityManagement />
        )}
        {currentTab === 'super_onboarding' && (
          <BranchOnboarding />
        )}
        {currentTab === 'super_reports' && (
          <SuperAdminReports />
        )}
        {currentTab === 'super_alerts' && (
          <SuperAdminAlerts onNavigateTab={handleTabSelect} />
        )}
        {currentTab === 'super_settings' && (
          <SuperAdminSettings />
        )}
      </main>
    </div>
  );
};

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = (props) => {
  return (
    <SuperAdminProvider>
      <SuperAdminPortalContent {...props} />
    </SuperAdminProvider>
  );
};
