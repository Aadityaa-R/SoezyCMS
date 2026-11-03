import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { useSidebar } from '@/context/SidebarContext';
import { shouldCloseSidebarOnClick } from '@/lib/sidebarOutsideClick';
import { hasCapability, canViewBilling, isAdmin } from '@/lib/permissions';
import { hasDashboardAccess } from '@/lib/navigation';
import { BRAND_CONFIG } from '@/brand.config';
import {
  LayoutDashboard,
  UserCheck,
  CreditCard,
  Pill,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  ShieldCheck,
  Clock,
  FileText,
  Calendar,
  X,
  Users,
  Contact,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen: propIsOpen,
  onClose: propOnClose,
  isCollapsed: propIsCollapsed,
  onToggleCollapse: propOnToggleCollapse,
}) => {
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : (propIsCollapsed !== undefined ? !propIsCollapsed : sidebarContext.isOpen);
  const close = propOnClose || sidebarContext.close;
  const toggle = propOnToggleCollapse || sidebarContext.toggle;

  const asideRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  // Track mobile breakpoint (< 1024px) for inert and aria-hidden attributes
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
    const handleBreakpoint = () => {
      setIsMobile(mql ? !mql.matches : window.innerWidth < 1024);
    };
    handleBreakpoint();
    window.addEventListener('resize', handleBreakpoint);
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleBreakpoint);
    }
    return () => {
      window.removeEventListener('resize', handleBreakpoint);
      if (mql && typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleBreakpoint);
      }
    };
  }, []);

  // Bubbling click listener outside the sidebar with drag detection (M10.8b)
  useEffect(() => {
    if (!isOpen) return;

    let dragStartedInside = false;

    const handlePointerDown = (e: Event) => {
      const sidebar = asideRef.current;
      const target = e.target as HTMLElement | null;
      dragStartedInside = !!(sidebar && target && (sidebar === target || sidebar.contains(target)));
    };

    const handleClick = (e: MouseEvent) => {
      const shouldClose = shouldCloseSidebarOnClick({
        target: e.target,
        sidebarElement: asideRef.current,
        dragStartedInside,
      });
      dragStartedInside = false;

      if (shouldClose) {
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('click', handleClick, false);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('click', handleClick, false);
    };
  }, [isOpen, close]);

  // Escape key closes the sidebar and returns focus directly to the toggle button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        toggleButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const { currentRole, currentUser } = useAuth();
  const { modules, isFacilityEnabled } = useClinic();
  const isSuperAdmin = currentRole === 'platform_super_admin';
  const isUserAdmin = currentRole === 'md' || currentRole === 'admin' || isSuperAdmin || isAdmin(currentUser, modules);

  const getNavItems = (): NavItem[] => {
    if (currentRole === 'patient') {
      return [
        { id: 'overview', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
        { id: 'records', label: 'Records', icon: <FileText className="w-4 h-4" /> },
        { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
        { id: 'billing', label: 'Invoices', icon: <CreditCard className="w-4 h-4" /> },
      ];
    }

    const items: NavItem[] = [];

    // 1. Dashboard
    if (hasDashboardAccess(currentRole, currentUser, modules)) {
      items.push({ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> });
    }

    // Enterprise Organizations (Platform Super Admin exclusive)
    if (currentRole === 'platform_super_admin') {
      items.push({ id: 'organizations', label: 'Organizations', icon: <Building2 className="w-4 h-4 text-purple-400" /> });
    }

    // 2. Clinic Staff (All staff & admin)
    items.push({ id: 'clinic_staff', label: 'Clinic Staff', icon: <Contact className="w-4 h-4" /> });

    // 3. Patients (All staff & admin)
    items.push({ id: 'patient', label: 'Patients', icon: <Users className="w-4 h-4" /> });

    // 4. Reception Calendar (Front desk or Administrative)
    const hasFrontDesk =
      hasCapability(currentUser, 'patientRegistration', modules) ||
      hasCapability(currentUser, 'patientCheckIn', modules);
    const hasAdminAccess = hasCapability(currentUser, 'administrativeAccess', modules);

    if ((hasFrontDesk || hasAdminAccess || currentRole === 'receptionist') && (isSuperAdmin || isFacilityEnabled('OPD'))) {
      items.push({ id: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> });
    }

    // 5. Consultation Desk (Clinical Station)
    if ((hasCapability(currentUser, 'consultationWorkstation', modules) || currentRole === 'doctor') && (isSuperAdmin || isFacilityEnabled('OPD'))) {
      items.push({ id: 'doctor', label: 'Consultation Desk', icon: <Stethoscope className="w-4 h-4" /> });
    }

    // 6. Front Desk Reception intake
    if ((hasFrontDesk || currentRole === 'receptionist') && (isSuperAdmin || isFacilityEnabled('OPD'))) {
      items.push({ id: 'role_receptionist', label: 'Reception', icon: <UserCheck className="w-4 h-4" /> });
    }

    // 6. Attendance (all staff)
    items.push({ id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" /> });

    // 7. Billing
    if (canViewBilling(currentUser, modules) && (isSuperAdmin || isFacilityEnabled('Billing'))) {
      items.push({ id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> });
    }

    // 8. Administrative
    if (hasAdminAccess) {
      items.push({ id: 'access_control', label: 'Administrative', icon: <ShieldCheck className="w-4 h-4" /> });
    }

    return items;
  };

  const navItems = getNavItems();

  const roleTitle = isUserAdmin
    ? 'Administrator'
    : currentRole === 'doctor'
    ? 'Doctor'
    : currentRole === 'receptionist'
    ? 'Reception'
    : currentRole === 'patient'
    ? 'Patient'
    : String(currentRole || 'Staff').replace('_', ' ');

  return (
    <>
      {/* Phone/tablet dimmed overlay (captures touches outside drawer and prevents under-press) */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden cursor-pointer transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Two-Column Shell Sidebar container: full height on left */}
      <aside
        id="sidebar-navigation"
        ref={asideRef}
        aria-label="Sidebar navigation"
        inert={!isOpen && isMobile ? '' : undefined}
        aria-hidden={!isOpen && isMobile ? 'true' : undefined}
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out motion-reduce:transition-none flex flex-col shrink-0 select-none ${
          isOpen ? 'w-64' : 'w-0 lg:w-[calc(var(--nav-cell)+0.75rem)]'
        } ${
          isMobile
            ? (isOpen ? 'translate-x-0' : '-translate-x-full')
            : 'translate-x-0'
        }`}
      >
        {/* Top Header: single toggle button level with navbar */}
        <div className="h-[var(--nav-cell)] px-1.5 flex items-center justify-between shrink-0 bg-[#28465a] border-b border-[#1e3545]">
          <div className="flex items-center min-w-0">
            <button
              ref={toggleButtonRef}
              type="button"
              data-sidebar-ignore-outside="true"
              onClick={(e) => {
                toggle();
                e.currentTarget.blur();
              }}
              className="w-[var(--nav-cell)] h-[var(--nav-cell)] flex items-center justify-center rounded-lg cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0 transition-colors duration-200 text-slate-300 hover:text-white hover:bg-white/10"
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={isOpen}
              aria-controls="sidebar-navigation"
            >
              {isOpen ? (
                <PanelLeftClose className="w-5 h-5 text-slate-200" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 text-slate-300" />
              )}
            </button>

            {/* Clinic Portal Brand Details */}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                isOpen ? 'max-w-[170px] opacity-100 ml-2.5' : 'lg:max-w-0 lg:opacity-0 lg:ml-0 max-w-[170px] opacity-100 ml-2.5'
              }`}
            >
              <div className="text-[10px] font-bold text-[#00c060] tracking-wider uppercase">
                {BRAND_CONFIG.subTitle}
              </div>
              <div className="text-xs font-semibold text-white capitalize truncate mt-0.5">
                {roleTitle} Portal
              </div>
            </div>
          </div>

          {/* Close button inside drawer on mobile */}
          <button
            type="button"
            data-sidebar-ignore-outside="true"
            onClick={close}
            className="w-[var(--nav-cell)] h-[var(--nav-cell)] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 shrink-0 transition-colors duration-200"
            title="Close drawer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 pt-1 pb-2 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden border-r border-[#eef0f3] dark:border-slate-800">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'doctor' && (activeTab === 'doctor' || activeTab === 'role_doctor' || activeTab === 'consulting_calendar')) ||
              (item.id === 'role_receptionist' && (activeTab === 'role_receptionist' || activeTab === 'receptionist' || activeTab === 'calendar')) ||
              (item.id === 'patient' && (activeTab === 'patient' || activeTab === 'patients' || activeTab === 'role_patient')) ||
              (item.id === 'appointments' && (activeTab === 'appointments' || activeTab === 'appointment')) ||
              (item.id === 'billing' && (activeTab === 'billing' || activeTab === 'admin_billing' || activeTab === 'invoices')) ||
              (item.id === 'access_control' && (activeTab === 'access_control' || activeTab === 'admin' || activeTab === 'access')) ||
              (item.id === 'attendance' && (activeTab === 'attendance' || activeTab === 'mycare')) ||
              (item.id === 'overview' && (activeTab === 'overview' || activeTab === 'appointments')) ||
              (item.id === 'dashboard' && (activeTab === 'dashboard' || !activeTab));

            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  onTabChange(item.id);
                  e.currentTarget.blur();
                  if (isMobile) {
                    close();
                  }
                }}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`${
                  isOpen ? 'w-full px-2' : 'w-[var(--nav-cell)] justify-center'
                } h-[var(--nav-cell)] flex items-center rounded-lg text-xs font-medium cursor-pointer outline-none focus:outline-none focus:ring-0 transition-colors duration-200 ${
                  isActive
                    ? 'bg-transparent text-[#00c060] dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span
                  title={item.label}
                  aria-label={item.label}
                  className={`w-7 h-7 flex items-center justify-center shrink-0 ${
                    isActive ? 'text-[#00c060] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`overflow-hidden whitespace-nowrap truncate transition-all duration-300 ease-in-out motion-reduce:transition-none text-left ${
                    isOpen
                      ? 'max-w-[170px] opacity-100 ml-2.5 font-medium'
                      : 'lg:max-w-0 lg:opacity-0 lg:ml-0 max-w-[170px] opacity-100 ml-2.5 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
