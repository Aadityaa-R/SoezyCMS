import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { focusIfKeyboard } from '@/lib/inputMode';
import { BRAND_CONFIG } from '@/brand.config';
import {
  Menu,
  X,
  Bell,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';
import { ClinicSwitcher } from './ClinicSwitcher';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  activeTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { userNotifications, unreadCount, markAllAsRead } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [menuFocusedIndex, setMenuFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setMenuFocusedIndex(-1);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
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
    setMenuFocusedIndex(-1);
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
    setMenuFocusedIndex(-1);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setMenuFocusedIndex(-1);
    logout();
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMenuFocusedIndex((prev) => {
        const next = prev < 3 ? prev + 1 : 0;
        menuItemsRef.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMenuFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 3;
        menuItemsRef.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMenuFocusedIndex(0);
      menuItemsRef.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setMenuFocusedIndex(3);
      menuItemsRef.current[3]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setMenuFocusedIndex(-1);
      avatarButtonRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsDropdownOpen(false);
      setMenuFocusedIndex(-1);
    }
  };

  const handleAvatarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setMenuFocusedIndex(0);
      setTimeout(() => {
        menuItemsRef.current[0]?.focus();
      }, 20);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setMenuFocusedIndex(3);
      setTimeout(() => {
        menuItemsRef.current[3]?.focus();
      }, 20);
    }
  };

  return (
    <>
      <header
        id="headerdiv"
        className="h-[var(--nav-cell)] w-full bg-[#28465a] border-b border-[#1e3545] text-white flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors pl-2 sm:pl-3"
        style={{
          paddingRight: 'var(--page-pad)',
        }}
      >
        {/* Brand / Clinic Title */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            data-sidebar-ignore-outside="true"
            onClick={onToggleSidebar || toggleSidebar}
            className={`w-8 h-8 flex items-center justify-center p-1.5 rounded-lg lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 ${
              isSidebarOpen
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
          >
            {isSidebarOpen ? (
              <X className="w-4 h-4 text-white" />
            ) : (
              <Menu className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.(currentRole === 'patient' ? 'overview' : (currentRole === 'platform_super_admin' ? 'organizations' : 'dashboard'))}
            className="flex items-center gap-2.5 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 group p-0 m-0 border-0 bg-transparent"
            title={currentRole === 'patient' ? 'Go to My Portal' : (currentRole === 'platform_super_admin' ? 'Go to Organizations' : 'Go to Dashboard')}
          >
            <img
              src={BRAND_CONFIG.logoAsset}
              alt={BRAND_CONFIG.hospitalName}
              className="h-8 w-auto object-contain select-none shrink-0"
            />
            {BRAND_CONFIG.showHeaderHospitalTitle && (
              <div className="hidden sm:flex flex-col justify-center min-w-0">
                <span className="font-bold text-xs tracking-tight text-white truncate leading-tight">
                  {BRAND_CONFIG.hospitalName}
                </span>
                <span className="text-[10px] text-slate-300 font-medium tracking-tight truncate leading-tight">
                  {BRAND_CONFIG.subTitle}
                </span>
              </div>
            )}
          </button>
          <div className="hidden sm:block h-5 w-px bg-white/20" />
          <ClinicSwitcher />
        </div>

        {/* Right Section: Notifications, then User Block Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications Indicator */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative outline-none focus:outline-none focus:ring-0"
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00c060] rounded-full ring-2 ring-[#28465a]" />
              )}
            </button>

            {/* Notification Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn text-slate-800 dark:text-slate-200">
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

          {/* User Profile Dropdown Container: Avatar, Name, Hospital Line */}
          <div className="relative pl-2.5 border-l border-white/20" ref={dropdownRef}>
            <button
              ref={avatarButtonRef}
              id="user-menu-button"
              type="button"
              onClick={() => {
                const next = !isDropdownOpen;
                setIsDropdownOpen(next);
                if (next) {
                  setMenuFocusedIndex(0);
                  setTimeout(() => menuItemsRef.current[0]?.focus(), 20);
                } else {
                  setMenuFocusedIndex(-1);
                }
              }}
              onKeyDown={handleAvatarKeyDown}
              className="flex items-center gap-2 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 p-0 m-0 border-0 bg-transparent group"
              aria-label="User profile menu"
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
              aria-controls="user-menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#00c060] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 ring-1 ring-white/30">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {BRAND_CONFIG.showHeaderUserBlock && (
                <div className="hidden md:flex flex-col justify-center min-w-0 pr-0 mr-0">
                  <span className="font-semibold text-xs tracking-tight text-white truncate leading-tight">
                    {currentUser?.name || 'Dr. Administrator'}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium tracking-tight truncate leading-tight">
                    {BRAND_CONFIG.hospitalName}
                  </span>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                ref={menuRef}
                id="user-menu"
                role="menu"
                aria-labelledby="user-menu-button"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-slate-900 shadow-modal border border-slate-200 dark:border-slate-800 py-1.5 z-50 transition-all duration-150 animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-2 border-b border-[#eef0f3] dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser?.name || 'User'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser?.email || 'user@soezy.local'}
                  </div>
                  <div className="text-[10px] text-[#00c060] dark:text-emerald-400 font-medium mt-0.5 truncate">
                    {BRAND_CONFIG.hospitalName}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    ref={(el) => (menuItemsRef.current[0] = el)}
                    id="menu-item-profile"
                    type="button"
                    role="menuitem"
                    tabIndex={menuFocusedIndex === 0 ? 0 : -1}
                    onClick={handleOpenProfile}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 outline-none flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    ref={(el) => (menuItemsRef.current[1] = el)}
                    id="menu-item-settings"
                    type="button"
                    role="menuitem"
                    tabIndex={menuFocusedIndex === 1 ? 0 : -1}
                    onClick={handleOpenSettings}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 outline-none flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Station Settings</span>
                  </button>

                  <button
                    ref={(el) => (menuItemsRef.current[2] = el)}
                    id="menu-item-theme"
                    type="button"
                    role="menuitem"
                    tabIndex={menuFocusedIndex === 2 ? 0 : -1}
                    onClick={toggleTheme}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 outline-none flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-slate-400" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-1 border-t border-[#eef0f3] dark:border-slate-800">
                  <button
                    ref={(el) => (menuItemsRef.current[3] = el)}
                    id="menu-item-logout"
                    type="button"
                    role="menuitem"
                    tabIndex={menuFocusedIndex === 3 ? 0 : -1}
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 focus:bg-rose-50 dark:focus:bg-rose-950/30 outline-none flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Terminal Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Terminal & Station Settings"
        description="Configure station preferences and notifications."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            Save Preferences
          </Button>
        }
      >
        <div className="space-y-6 text-xs">
          {/* Category 1: Clinical Alerts & Notifications */}
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Clinical Alerts & Notifications
            </div>
            <div className="space-y-2.5 pl-0.5">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Audible chime on high-priority appointments</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Real-time queue update banners</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Broadcast immediate alert on critical patient vitals</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Browser desktop notifications for patient arrivals</span>
              </div>
            </div>
          </div>

          {/* Category 2: Display & Workspace Density */}
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Display & Workspace Density
            </div>
            <div className="space-y-2.5 pl-0.5">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">High contrast clinical table borders</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Compact table row density</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Auto-refresh active worklist queues every 30 seconds</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-[#00c060] focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Highlight STAT and urgent orders with high-visibility indicator</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
