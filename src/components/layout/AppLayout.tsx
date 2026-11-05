import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from '@/context/SidebarContext';
import { LoginView } from '@/views/LoginView';

// Role views
import { DashboardView } from '@/views/DashboardView';
import { AppointmentsView } from '@/views/AppointmentsView';
import { DoctorView } from '@/views/DoctorView';
import { PatientView } from '@/views/PatientView';
import { ReceptionistView } from '@/views/ReceptionistView';
import { AccessControlView } from '@/views/AccessControlView';
import { AttendanceView } from '@/views/AttendanceView';
import { BillingView } from '@/views/BillingView';
import { ProfileView } from '@/views/ProfileView';
import { ClinicStaffView } from '@/views/ClinicStaffView';
import { SuperAdminPortal } from '@/views/superadmin/SuperAdminPortal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AlertCircle } from 'lucide-react';
import { hasCapability, canViewBilling } from '@/lib/permissions';
import { UserRole } from '@/types';
import {
  hasExistingValidSession,
  clearRememberedLastPage,
  getAllowedNavItems,
  isTabAllowed,
  getPageTitle,
} from '@/lib/navigation';
import { useClinic } from '@/context/ClinicContext';
import { BRAND_CONFIG } from '@/brand.config';

import { PageContainer } from './PageContainer';

export const AppLayout: React.FC = () => {
  const { currentRole, currentUser, isAuthenticated, isRoleSuspended, logout } = useAuth();
  const { modules, currentOrganization } = useClinic();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'profile') return 'profile';
      if (currentRole === 'platform_super_admin') {
        return (tabParam && (tabParam.startsWith('super_') || tabParam === 'organizations'))
          ? tabParam
          : 'super_dashboard';
      }
      if (hasExistingValidSession() && tabParam) return tabParam;
      return currentRole === 'patient' ? 'overview' : 'dashboard';
    } catch {
      return currentRole === 'platform_super_admin' ? 'super_dashboard' : (currentRole === 'patient' ? 'overview' : 'dashboard');
    }
  });
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('subtab') || undefined;
    } catch {
      return undefined;
    }
  });
  const [isProfileDirty, setIsProfileDirty] = useState<boolean>(false);
  const [pendingNav, setPendingNav] = useState<{ tab: string; subTab?: string } | null>(null);

  const prevAuthRef = useRef<boolean>(isAuthenticated);
  const hasValidatedInitialSessionRef = useRef<boolean>(false);
  const prevRoleRef = useRef<UserRole>(currentRole);

  // Sync activeTab on auth state transition and session initial load
  useEffect(() => {
    if (!isAuthenticated) {
      hasValidatedInitialSessionRef.current = false;
      prevAuthRef.current = false;
      return;
    }

    const targetAudience = currentRole === 'patient'
      ? 'patient'
      : currentRole === 'platform_super_admin'
      ? 'superadmin'
      : (currentRole === 'md' ? 'admin' : 'staff');
    const allowed = getAllowedNavItems(currentRole, currentUser, modules, currentOrganization?.facilities);
    const hasDashboard = currentRole === 'patient' || allowed.some((item) => item.id === 'dashboard');
    const defaultLandingTab = currentRole === 'platform_super_admin'
      ? 'super_dashboard'
      : currentRole === 'patient'
      ? 'dashboard'
      : (hasDashboard ? 'dashboard' : (allowed[0]?.id || 'dashboard'));

    const resolveAllowedTab = (tab: string | null | undefined): string => {
      if (!tab) return defaultLandingTab;
      if (currentRole === 'platform_super_admin' && (tab === 'super_facilities' || tab === 'facilities')) {
        return 'super_clinics';
      }
      return isTabAllowed(tab, currentRole, currentUser, modules, currentOrganization?.facilities)
        ? tab
        : defaultLandingTab;
    };

    // 1. Fresh sign-in: set active page to Organizations for super admin or Dashboard for others
    if (!prevAuthRef.current) {
      prevAuthRef.current = true;
      hasValidatedInitialSessionRef.current = true;
      clearRememberedLastPage();
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      const targetTab = resolveAllowedTab(urlTab);
      setActiveTab(targetTab);
      setActiveSubTab(undefined);
      try {
        const pathname = window.location.pathname.startsWith('/profile') ? '/' : window.location.pathname;
        window.history.replaceState(
          {},
          '',
          `${pathname}?as=${targetAudience}&tab=${targetTab}`
        );
      } catch {}
      return;
    }

    // Role switch while authenticated
    if (prevRoleRef.current !== currentRole) {
      prevRoleRef.current = currentRole;
      clearRememberedLastPage();
      setActiveTab(defaultLandingTab);
      setActiveSubTab(undefined);
      try {
        const pathname = window.location.pathname.startsWith('/profile') ? '/' : window.location.pathname;
        window.history.replaceState(
          {},
          '',
          `${pathname}?as=${targetAudience}&tab=${defaultLandingTab}`
        );
      } catch {}
      return;
    }

    // 2. Existing valid session on initial load / refresh
    if (!hasValidatedInitialSessionRef.current) {
      hasValidatedInitialSessionRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const targetTab = resolveAllowedTab(tabParam);
      setActiveTab(targetTab);
      if (targetTab !== tabParam) {
        setActiveSubTab(undefined);
        try {
          const pathname = window.location.pathname.startsWith('/profile') ? '/' : window.location.pathname;
          window.history.replaceState(
            {},
            '',
            `${pathname}?as=${targetAudience}&tab=${targetTab}`
          );
        } catch {}
      }
    }
  }, [isAuthenticated, currentRole, currentUser, modules, currentOrganization?.facilities]);

  // Sync URL history state on popstate
  useEffect(() => {
    const handlePopState = () => {
      try {
        const pathname = window.location.pathname.toLowerCase();
        if (pathname === '/profile' || pathname.startsWith('/profile/')) {
          setActiveTab('profile');
          setActiveSubTab(undefined);
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'profile') {
          setActiveTab('profile');
          setActiveSubTab(undefined);
          return;
        }
        if (currentRole === 'platform_super_admin' && (tabParam === 'super_facilities' || tabParam === 'facilities')) {
          setActiveTab('super_clinics');
          setActiveSubTab(undefined);
          return;
        }
        if (tabParam && isTabAllowed(tabParam, currentRole, currentUser, modules, currentOrganization?.facilities)) {
          setActiveTab(tabParam);
        } else {
          setActiveTab(currentRole === 'patient' ? 'overview' : 'dashboard');
        }
        setActiveSubTab(params.get('subtab') || undefined);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentRole, currentUser, modules, currentOrganization?.facilities]);

  // Sync document page title
  useEffect(() => {
    if (!isAuthenticated) {
      document.title = `${BRAND_CONFIG.hospitalName} - ${BRAND_CONFIG.subTitle}`;
      return;
    }
    const title = getPageTitle(activeTab, currentRole);
    document.title = `${title} | ${BRAND_CONFIG.hospitalName}`;
  }, [activeTab, currentRole, isAuthenticated]);



  // If a user was viewing access_control and their admin capability was revoked, return immediately to dashboard
  useEffect(() => {
    if (activeTab === 'access_control' && !hasCapability(currentUser, 'administrativeAccess', modules)) {
      setActiveTab('dashboard');
      setActiveSubTab(undefined);
    }
  }, [activeTab, currentUser, modules]);

  // If user signed out, display login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If active role is suspended by the MD, display security lock screen
  if (isRoleSuspended(currentRole)) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-6 text-center ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-card dark:shadow-none print:shadow-none space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Station Access Suspended
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Workstation access for this role has been revoked by <strong>Dr. Marcus Vance (Managing Director)</strong>. Please contact the clinic administrator to request access clearance.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => logout()}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const executeNavigate = (tab: string, subTab?: string) => {
    if (tab === 'profile') {
      try {
        window.history.pushState({}, '', '/profile');
      } catch {}
    } else {
      try {
        const url = new URL(window.location.href);
        if (url.pathname === '/profile') {
          url.pathname = '/';
        }
        url.searchParams.set('tab', tab);
        if (subTab) {
          url.searchParams.set('subtab', subTab);
        } else {
          url.searchParams.delete('subtab');
        }
        window.history.pushState({}, '', url.pathname + url.search);
      } catch {}
    }
    setActiveTab(tab);
    setActiveSubTab(subTab);
    const mainEl = document.getElementById('main-content');
    if (mainEl && typeof mainEl.scrollTo === 'function') {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleNavigate = (tab: string, subTab?: string) => {
    if (activeTab === 'profile' && isProfileDirty && tab !== 'profile') {
      setPendingNav({ tab, subTab });
      return;
    }
    executeNavigate(tab, subTab);
  };

  const renderActiveView = () => {
    if (activeTab === 'profile' || (typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/profile')) {
      return (
        <ProfileView
          onNavigate={handleNavigate}
          onDirtyChange={setIsProfileDirty}
        />
      );
    }

    if (currentRole === 'patient') {
      return <PatientView activeTab={activeSubTab || (activeTab === 'dashboard' ? 'overview' : activeTab)} />;
    }

    if (activeTab === 'appointments' || activeTab === 'appointment') {
      return <AppointmentsView />;
    }

    if (activeTab === 'dashboard') {
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'doctor' || activeTab === 'role_doctor') {
      if (hasCapability(currentUser, 'consultationWorkstation', modules)) {
        return <DoctorView activeTab={activeSubTab || 'overview'} isReadOnlyView={false} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'consulting_calendar') {
      if (hasCapability(currentUser, 'consultingCalendar', modules)) {
        return <DoctorView activeTab={activeSubTab || 'overview'} isReadOnlyView={false} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'role_receptionist' || activeTab === 'receptionist' || activeTab === 'calendar') {
      const hasFrontDesk =
        hasCapability(currentUser, 'patientRegistration', modules) ||
        hasCapability(currentUser, 'patientCheckIn', modules);
      const hasAdmin = hasCapability(currentUser, 'administrativeAccess', modules);
      if (hasFrontDesk || hasAdmin) {
        return (
          <ReceptionistView
            activeTab={activeTab === 'calendar' ? 'calendar' : (activeSubTab || 'overview')}
            isReadOnlyView={!hasFrontDesk}
          />
        );
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'access_control') {
      if (hasCapability(currentUser, 'administrativeAccess', modules)) {
        return <AccessControlView activeTab={activeSubTab || 'modules'} onNavigate={handleNavigate} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'clinic_staff' || activeTab === 'staff' || activeTab === 'staff_directory') {
      return <ClinicStaffView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'role_patient' || activeTab === 'patient' || activeTab === 'patients') {
      return (
        <PatientView
          activeTab={activeSubTab || 'overview'}
          isReadOnlyView={!hasCapability(currentUser, 'emrRecordsAccess', modules)}
        />
      );
    }

    if (activeTab === 'admin_billing' || activeTab === 'billing') {
      if (canViewBilling(currentUser, modules)) {
        return <BillingView />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'attendance') {
      return <AttendanceView activeTab={activeSubTab} />;
    }

    if (currentRole === 'platform_super_admin' || activeTab.startsWith('super_') || activeTab === 'organizations') {
      return <SuperAdminPortal initialTab={activeTab} onNavigateGlobal={handleNavigate} />;
    }

    return <DashboardView onNavigate={handleNavigate} />;
  };

  return (
    <SidebarProvider>
      <div className={`h-screen flex flex-col font-sans antialiased overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#fafafa] text-slate-800'}`}>
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-slate-900 focus:text-slate-900 focus:dark:text-slate-100 focus:border focus:border-slate-300 focus:dark:border-slate-700 focus:rounded-lg focus:shadow-modal focus:outline-none text-xs font-semibold"
        >
          Skip to main content
        </a>

        {/* Global polite live region for screen reader announcements */}
        <div
          id="global-status-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        <div className="flex-1 flex overflow-hidden h-full min-h-0">
          {/* Dynamic Role-specific Sidebar: strictly provides only this role's modules */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => handleNavigate(tab)}
          />

          {/* Content Shell */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
            {/* Header with profile & logout - pinned at top */}
            <Navbar
              activeTab={activeTab}
              onNavigate={handleNavigate}
            />

            {/* Compliance License Expired Notice (Minimalist & Non-intrusive) */}
            {currentOrganization?.licenseStatus === 'expired' && currentRole !== 'platform_super_admin' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>License Expired:</strong> {currentOrganization.name}&apos;s license expired on {currentOrganization.licenseValidUntil}. Clinical workstations are operating in compliance renewal mode. Please contact Platform Super Admin for license renewal.
                  </span>
                </div>
              </div>
            )}

            {/* Main View Area - dedicated scrollable container extending full width flush against panels */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 min-h-0 overflow-y-auto w-full outline-none [scrollbar-gutter:stable]"
              style={{
                paddingLeft: 'var(--page-pad)',
                paddingRight: 'var(--page-pad)',
                paddingBottom: 'var(--page-pad)',
                paddingTop: 'var(--page-pad)',
                scrollbarGutter: 'stable',
              }}
            >
              <ErrorBoundary>
                <PageContainer>
                  {renderActiveView()}
                </PageContainer>
              </ErrorBoundary>
            </main>
          </div>
        </div>

        {/* Discard changes dialog when attempting to navigate away from dirty profile */}
        {pendingNav && (
          <Modal
            isOpen={true}
            onClose={() => setPendingNav(null)}
            title="Discard changes?"
            description="You have unsaved changes to your contact details. Are you sure you want to discard them?"
            maxWidth="sm"
            hideCloseButton={true}
            footer={
              <div className="flex items-center justify-end gap-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingNav(null)}
                >
                  Keep editing
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsProfileDirty(false);
                    const target = pendingNav;
                    setPendingNav(null);
                    if (target) {
                      executeNavigate(target.tab, target.subTab);
                    }
                  }}
                >
                  Discard
                </Button>
              </div>
            }
          >
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Any modifications you made will not be saved.
            </p>
          </Modal>
        )}
      </div>
    </SidebarProvider>
  );
};
