import React, { useState, useEffect } from 'react';
import { SuperAdminProvider, useSuperAdmin, useOptionalSuperAdmin } from '../../context/SuperAdminContext';
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
  const { setSelectedClinicId } = useSuperAdmin();

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

  return (
    <div className="w-full">
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
    </div>
  );
};

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = (props) => {
  const existing = useOptionalSuperAdmin();
  if (existing) {
    return <SuperAdminPortalContent {...props} />;
  }
  return (
    <SuperAdminProvider>
      <SuperAdminPortalContent {...props} />
    </SuperAdminProvider>
  );
};
