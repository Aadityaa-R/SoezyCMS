import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { focusIfKeyboard } from '@/lib/inputMode';
import {
  Menu,
  X,
  Bell,
  Settings,
  Moon,
  Sun,
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Rocket,
  ChevronDown,
  BookOpen,
  HelpCircle,
  Building2,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  activeTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, activeTab }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { userNotifications, unreadCount, markAllAsRead } = useNotifications();

  // Dropdown and modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChangeClinicOpen, setIsChangeClinicOpen] = useState(false);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPublicQuestionsOpen, setIsPublicQuestionsOpen] = useState(false);

  // Clinic Branch state
  const [selectedBranch, setSelectedBranch] = useState('SOEZY Clinic - Main Pune');
  const [pendingBranch, setPendingBranch] = useState('SOEZY Clinic - Main Pune');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isDropdownOpen || isMoreOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isMoreOpen, isNotificationsOpen]);

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    onNavigate?.('profile');
    setTimeout(() => {
      const heading = document.getElementById('profile-heading');
      if (heading) {
        focusIfKeyboard(heading);
      }
    }, 50);
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  // Main SOEZY navigation tabs
  const navTabs = [
    {
      id: 'getstarted',
      label: 'Get Started',
      icon: Rocket,
      isActive: false,
      onClick: () => setIsGetStartedOpen(true),
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: activeTab === 'dashboard',
      onClick: () => onNavigate?.('dashboard'),
    },
    {
      id: 'appointment',
      label: 'Appointments',
      icon: Calendar,
      isActive: activeTab === 'doctor',
      onClick: () => onNavigate?.('doctor'),
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      isActive: activeTab === 'receptionist',
      onClick: () => onNavigate?.('receptionist'),
    },
    {
      id: 'mycare',
      label: 'Care Team',
      icon: UserCheck,
      isActive: activeTab === 'attendance',
      onClick: () => onNavigate?.('attendance'),
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      isActive: false,
      onClick: () => setIsCommunicationOpen(true),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      isActive: activeTab === 'billing',
      onClick: () => onNavigate?.('billing'),
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: ShieldCheck,
      isActive: activeTab === 'access',
      onClick: () => onNavigate?.('access'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: false,
      onClick: () => setIsSettingsModalOpen(true),
    },
  ];

  return (
    <>
      <header
        id="headerdiv"
        className="w-full bg-[#1e3a5f] border-b border-[#152a45] sticky top-0 z-20 shrink-0 transition-colors shadow-sm"
      >
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 flex items-center justify-between h-14">
          {/* Left Section: Logo & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              data-sidebar-ignore-outside="true"
              onClick={onToggleSidebar || toggleSidebar}
              className="w-9 h-9 flex items-center justify-center p-2 rounded-lg lg:hidden cursor-pointer text-white hover:bg-white/10 transition-colors"
              title={isSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>

            {/* Slanted White Tab for SOEZY Logo matching Login page */}
            <button
              type="button"
              onClick={() => onNavigate?.('dashboard')}
              className="bg-white h-14 px-6 sm:px-8 flex items-center justify-center -skew-x-[26deg] shadow-md -ml-3 sm:-ml-6 cursor-pointer outline-none focus:outline-none"
              title="SOEZY Web Dashboard"
            >
              <div className="skew-x-[26deg] flex items-center justify-center py-1">
                <img
                  src="/soezy-logo.png"
                  alt="Soezy"
                  className="h-7 sm:h-8 w-auto object-contain select-none"
                />
              </div>
            </button>
          </div>

          {/* Center Section: Main SOEZY Navigation Menu */}
          <nav className="hidden lg:flex items-center h-full space-x-0.5 xl:space-x-1 overflow-x-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.onClick}
                  className={`h-14 px-2.5 xl:px-3 flex items-center gap-1.5 text-xs font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap outline-none ${
                    tab.isActive
                      ? 'border-[#00c853] text-white font-bold bg-white/10'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.isActive ? 'text-[#00c853]' : 'text-slate-300'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* More Menu Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`h-14 px-2.5 xl:px-3 flex items-center gap-1 text-xs font-medium transition-colors border-b-2 border-transparent cursor-pointer outline-none ${
                  isMoreOpen ? 'text-white border-[#00c853] bg-white/10' : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsBlogOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#00c853] text-left cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>Blog</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsGuideOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#00c853] text-left cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsPublicQuestionsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#00c853] text-left cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>Public Questions</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right Section: Notifications, Theme, Doctor Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notifications Indicator */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative outline-none"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00c853] rounded-full ring-2 ring-[#1e3a5f]" />
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        className="text-[11px] text-[#00c853] font-medium hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {userNotifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No notifications
                    </div>
                  ) : (
                    <div className="py-2 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {userNotifications.map((notif) => (
                        <div key={notif.id} className="p-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Doctor Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                role="button"
                tabIndex={0}
              >
                <div className="profile-info text-right hidden sm:block">
                  <span className="name font-bold text-white text-xs block leading-tight">
                    {currentUser?.name || 'Doctor'}
                  </span>
                  <span className="speciality text-[11px] text-slate-300 block leading-tight">
                    {currentRole === 'doctor' ? 'General Medicine' : currentRole.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                </div>
              </div>

              {/* SOEZY Profile Popup Card */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn">
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                        {currentUser?.name || 'Doctor'}
                      </div>
                      <div className="text-[11px] text-[#00c853] font-semibold mt-0.5 truncate">
                        {selectedBranch}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Address: PUNE, MAHARASHTRA
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        License Expiry: 2028-12-31
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenProfile}
                        className="text-[11px] text-[#00c853] hover:underline font-medium mt-1 cursor-pointer block"
                      >
                        profile
                      </button>
                    </div>
                  </div>

                  {/* Switch Branch Action */}
                  <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsChangeClinicOpen(true);
                      }}
                      className="w-full text-xs text-left px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Switch Clinic / Branch</span>
                      <Building2 className="w-3.5 h-3.5 text-[#00c853]" />
                    </button>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2.5 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                    >
                      settings
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 1. CHANGE CLINIC MODAL (from SOEZY HTML) */}
      {isChangeClinicOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-md shadow-2xl max-w-[450px] w-full overflow-hidden border border-slate-200">
            <div className="bg-[#3a647f] px-5 py-3 text-white font-semibold text-base">
              Change Clinic
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 text-sm">
                Your data will be lost if you change the clinic in the middle of the consultation.
              </p>
              <p className="font-semibold text-slate-900 text-sm">
                What do you want to do now?
              </p>
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Select Clinic Branch
                </label>
                <select
                  value={pendingBranch}
                  onChange={(e) => setPendingBranch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-[#00c853] focus:outline-none"
                >
                  <option value="SOEZY Clinic - Main Pune">SOEZY Clinic - Main Pune</option>
                  <option value="SOEZY Clinic - Metro Center (Mumbai)">SOEZY Clinic - Metro Center (Mumbai)</option>
                  <option value="SOEZY Clinic - Health City (Bangalore)">SOEZY Clinic - Health City (Bangalore)</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsChangeClinicOpen(false)}
                  className="flex-1 py-2 px-4 rounded text-xs font-semibold uppercase tracking-wider bg-white text-[#00c853] border border-[#00c853] hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch(pendingBranch);
                    setIsChangeClinicOpen(false);
                  }}
                  className="flex-1 py-2 px-4 rounded text-xs font-semibold uppercase tracking-wider text-white bg-[#00c853] hover:bg-[#00b048] transition-colors cursor-pointer shadow-sm"
                >
                  Change Clinic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GET STARTED MODAL */}
      <Modal
        isOpen={isGetStartedOpen}
        onClose={() => setIsGetStartedOpen(false)}
        title="Get Started with SOEZY"
        description="India's 1st Integrated Digital Healthcare Platform"
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsGetStartedOpen(false)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Start Practicing
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Calendar className="w-4 h-4 text-[#00c853]" />
                <span>1. Appointments</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Manage today's patient queue, schedule recurring consultations, and track check-ins.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Rocket className="w-4 h-4 text-[#00c853]" />
                <span>2. Issue e-Rx</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Prescribe medicines, dosage regimens, investigations, and print clinical slips instantly.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Users className="w-4 h-4 text-[#00c853]" />
                <span>3. Patient Records</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Access full longitudinal medical histories, past visits, vital signs, and diagnostics.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <BarChart3 className="w-4 h-4 text-[#00c853]" />
                <span>4. Billing & Analytics</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Generate GST compliant receipts, track collections, and analyze daily practice trends.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* 3. COMMUNICATION MODAL */}
      <Modal
        isOpen={isCommunicationOpen}
        onClose={() => setIsCommunicationOpen(false)}
        title="Digitized Communication Center"
        description="Unlimited SMS, Emails and Reminders for Your Clinic"
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCommunicationOpen(false)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xl font-bold text-[#00c853]">Unlimited</div>
              <div className="text-[11px] text-slate-600 font-medium mt-1">SMS Reminders</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-600">Active</div>
              <div className="text-[11px] text-slate-600 font-medium mt-1">Email Gateway</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xl font-bold text-purple-600">Enabled</div>
              <div className="text-[11px] text-slate-600 font-medium mt-1">WhatsApp Alerts</div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-800 text-xs">Automated Patient Reminders</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Appointments scheduled in the system automatically receive confirmation and 2-hour reminder notifications with doctor directions.
            </p>
          </div>
        </div>
      </Modal>

      {/* 4. BLOG MODAL */}
      <Modal
        isOpen={isBlogOpen}
        onClose={() => setIsBlogOpen(false)}
        title="SOEZY Clinical Blog"
        description="Insights, Medical Advances, and Digital Health Guidelines"
        maxWidth="md"
        footer={
          <Button size="sm" variant="primary" onClick={() => setIsBlogOpen(false)} className="!bg-[#00c853]">
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs mb-1">
              Optimizing OPD Consultation Workflows with Integrated e-Rx
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              How streamlining digital prescription issuing reduces queue turnaround by up to 45% while preserving patient record clarity.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs mb-1">
              Telemedicine & Digital Patient Communication Best Practices
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Enhancing follow-up compliance and patient satisfaction through automated SMS reminders and secure digital prescription access.
            </p>
          </div>
        </div>
      </Modal>

      {/* 5. GUIDE MODAL */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="SOEZY User Guide & Manual"
        description="Quick Help and System Documentation"
        maxWidth="md"
        footer={
          <Button size="sm" variant="primary" onClick={() => setIsGuideOpen(false)} className="!bg-[#00c853]">
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            Welcome to the SOEZY Digital Healthcare Platform. Use the top menu bar to quickly jump between active modules:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-slate-600">
            <li><strong>Dashboard:</strong> Practice metrics, fee collections, and patient visit trends.</li>
            <li><strong>Appointments:</strong> Live consultation desk, vitals monitoring, and e-Rx generation.</li>
            <li><strong>Patients:</strong> Centralized patient registry, registration, and queue admissions.</li>
            <li><strong>Care Team:</strong> Staff attendance, roster management, and duty schedules.</li>
            <li><strong>Reports:</strong> Comprehensive financial reports, invoice generation, and revenue summaries.</li>
          </ul>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between mt-2">
            <div>
              <div className="font-bold text-[#00c853]">Need direct assistance?</div>
              <div className="text-[11px] text-slate-600">Contact SOEZY Helpdesk anytime</div>
            </div>
            <a
              href="tel:+919543279999"
              className="text-xs font-bold text-slate-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded border border-slate-300"
            >
              <Phone className="w-3.5 h-3.5 text-[#00c853]" />
              <span>+ 91 9543279999</span>
            </a>
          </div>
        </div>
      </Modal>

      {/* 6. PUBLIC QUESTIONS MODAL */}
      <Modal
        isOpen={isPublicQuestionsOpen}
        onClose={() => setIsPublicQuestionsOpen(false)}
        title="Public Questions & Doctor Assist"
        description="Community patient queries and expert medical answers"
        maxWidth="md"
        footer={
          <Button size="sm" variant="primary" onClick={() => setIsPublicQuestionsOpen(false)} className="!bg-[#00c853]">
            Done
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-[#00c853] font-semibold text-[11px] mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answered by Doctor</span>
            </div>
            <p className="font-semibold text-slate-800 text-xs">
              "How frequently should blood pressure be measured during medication titration?"
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Patients initiating or modifying antihypertensive therapy should measure vitals morning and evening for 7 days before clinical review.
            </p>
          </div>
        </div>
      </Modal>

      {/* 7. SETTINGS MODAL */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Terminal & Station Settings"
        description="Configure station preferences and clinic notifications."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsSettingsModalOpen(false)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Preferences
          </Button>
        }
      >
        <div className="space-y-6 text-xs">
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Clinical Alerts & Notifications
            </div>
            <div className="space-y-2.5 pl-0.5">
              <label className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c853] focus:ring-0 outline-none cursor-pointer"
                />
                <span>Audible chime on high-priority appointments</span>
              </label>
              <label className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c853] focus:ring-0 outline-none cursor-pointer"
                />
                <span>Real-time queue update banners</span>
              </label>
              <label className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c853] focus:ring-0 outline-none cursor-pointer"
                />
                <span>Broadcast immediate alert on critical patient vitals</span>
              </label>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Display Theme
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-slate-700 dark:text-slate-200">Toggle Dark / Light Mode</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
