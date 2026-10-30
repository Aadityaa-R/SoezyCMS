import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import {
  Menu,
  X,
  Bell,
  User,
  Building2,
  Phone,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  activeTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, activeTab: _activeTab }) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { userNotifications, unreadCount, markAllAsRead } = useNotifications();

  // Dropdown and modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChangeClinicOpen, setIsChangeClinicOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPublicQuestionsOpen, setIsPublicQuestionsOpen] = useState(false);

  // Clinic Branch state
  const [selectedBranch, setSelectedBranch] = useState('SOEZY Clinic - Main Pune');
  const [pendingBranch, setPendingBranch] = useState('SOEZY Clinic - Main Pune');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    onNavigate?.('profile');
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  return (
    <>
      <header
        id="headerdiv"
        className="w-full bg-[#28465a] border-b border-[#1e3545] sticky top-0 z-20 shrink-0 transition-colors shadow-sm"
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand / Logo & Clinic Title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle (drawer on mobile only) */}
            <button
              type="button"
              data-sidebar-ignore-outside="true"
              onClick={onToggleSidebar || toggleSidebar}
              className={`w-9 h-9 flex items-center justify-center rounded-lg lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                isSidebarOpen
                  ? 'bg-white/20 text-white'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
              title={isSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Slanted White Tab for SOEZY Logo matching Login page */}
            <button
              type="button"
              onClick={() => onNavigate?.('dashboard')}
              className="bg-white h-14 px-6 sm:px-8 flex items-center justify-center -skew-x-[26deg] shadow-md -ml-4 sm:-ml-6 cursor-pointer outline-none focus:outline-none shrink-0 group"
              title="SOEZY Web Dashboard"
            >
              <div className="skew-x-[26deg] flex items-center justify-center py-1">
                <img
                  src="/soezy-logo.png"
                  alt="SOEZY - It's All Easy"
                  className="h-8 sm:h-9 w-auto object-contain select-none"
                />
              </div>
            </button>

            {/* Hospital Name & Subtitle */}
            <div className="min-w-0 text-left hidden sm:block ml-2 pl-3 border-l border-white/20">
              <h1 className="font-bold text-white text-sm sm:text-base leading-tight tracking-tight truncate max-w-[280px]">
                Subiksham Speciality Hospital
              </h1>
              <p className="text-[10px] text-slate-300 font-medium">SOEZY Clinic Operations</p>
            </div>
          </div>

          {/* Right Section: Notifications, Theme, Doctor Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Notifications Indicator */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative outline-none focus:outline-none focus:ring-0"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#00c060] rounded-full ring-2 ring-[#28465a]" />
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
                        className="text-[11px] text-[#00c060] font-medium hover:underline cursor-pointer"
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
                className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                role="button"
                tabIndex={0}
              >
                <div className="w-8 h-8 rounded-full bg-[#00c060] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white/20 shadow-xs">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="profile-info text-left hidden md:block">
                  <span className="name font-bold text-white text-xs block leading-tight">
                    {currentUser?.name || 'Dr. Marcus Vance'}
                  </span>
                  <span className="speciality text-[10px] text-slate-300 block leading-tight uppercase truncate max-w-[160px]">
                    Subiksham Speciality
                  </span>
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
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-slate-400 focus:outline-none"
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
