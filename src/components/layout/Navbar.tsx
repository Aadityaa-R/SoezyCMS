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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';
import { useOptionalSuperAdmin } from '@/context/SuperAdminContext';

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
  const superAdmin = useOptionalSuperAdmin();
  const isSuperAdmin = currentRole === 'platform_super_admin';
  const superAdminAlerts = superAdmin?.alerts || [];
  const unacknowledgedSuperAdminAlerts = superAdminAlerts.filter((a) => !a.acknowledged);
  const totalUnreadCount = isSuperAdmin ? unacknowledgedSuperAdminAlerts.length : unreadCount;
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
        className={`h-[var(--nav-cell)] w-full flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors pl-2 sm:pl-3 ${
          isSuperAdmin
            ? 'bg-[var(--superadmin-topbar-bg)] text-white border-b border-black/20'
            : 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}
        style={{
          paddingRight: 'var(--page-pad)',
        }}
      >
        {/* Brand / Clinic Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            data-sidebar-ignore-outside="true"
            onClick={onToggleSidebar || toggleSidebar}
            className={
              isSuperAdmin
                ? 'w-8 h-8 flex items-center justify-center p-1.5 rounded-lg text-white hover:bg-white/10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors'
                : `w-8 h-8 flex items-center justify-center p-1.5 rounded-lg lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                    isSidebarOpen
                      ? 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
            }
            title={
              isSuperAdmin
                ? (isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar')
                : (isSidebarOpen ? 'Close menu' : 'Open menu')
            }
            aria-label={
              isSuperAdmin
                ? (isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar')
                : (isSidebarOpen ? 'Close menu' : 'Open menu')
            }
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
          >
            {isSuperAdmin ? (
              isSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 text-white" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 text-white" />
              )
            ) : (
              isSidebarOpen ? (
                <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              ) : (
                <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              )
            )}
          </button>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => onNavigate?.('super_dashboard')}
              className="flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg p-0 m-0 border-0 bg-transparent"
              title="SOEZY CMS Platform"
              aria-label="SOEZY CMS Platform Overview"
            >
              <div className="bg-white px-2.5 py-1 rounded-md shadow-xs flex items-center justify-center shrink-0">
                <img
                  src="/soezy-logo.png"
                  alt="SOEZY CMS"
                  className="h-7 w-auto object-contain shrink-0"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate?.(currentRole === 'patient' ? 'overview' : 'dashboard')}
              className="flex items-center gap-2.5 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 group p-0 m-0 border-0 bg-transparent"
              title="SOEZY CMS Platform"
            >
              <img
                src="/soezy-logo.png"
                alt="SOEZY CMS"
                className="h-8 w-auto object-contain shrink-0"
                onError={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </button>
          )}
        </div>

        {/* Right Section: Notifications, then User Block Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Indicator */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={
                isSuperAdmin
                  ? "w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative outline-none focus-visible:ring-2 focus-visible:ring-white"
                  : "w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer relative outline-none focus:outline-none focus:ring-0"
              }
              aria-label={`Notifications (${totalUnreadCount} unread)`}
            >
              <Bell className={`w-4 h-4 ${isSuperAdmin ? 'text-white' : ''}`} />
              {totalUnreadCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ${
                  isSuperAdmin ? 'bg-white ring-[var(--superadmin-topbar-bg)]' : 'bg-teal-500 ring-white dark:ring-slate-900'
                }`} />
              )}
            </button>

            {/* Notification Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn text-slate-800 dark:text-slate-200">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Notifications ({totalUnreadCount})
                  </span>
                  {isSuperAdmin ? (
                    unacknowledgedSuperAdminAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          unacknowledgedSuperAdminAlerts.forEach((a) => superAdmin?.dismissAlert(a.id));
                        }}
                        className="text-[11px] text-teal-600 dark:text-teal-400 font-medium hover:underline cursor-pointer"
                      >
                        Acknowledge all
                      </button>
                    )
                  ) : (
                    unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        className="text-[11px] text-teal-600 dark:text-teal-400 font-medium hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )
                  )}
                </div>

                {/* Notifications List (Max 4 items displayed directly) */}
                {isSuperAdmin ? (
                  superAdminAlerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No administrative alerts or notifications
                    </div>
                  ) : (
                    <div className="py-1 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {superAdminAlerts.slice(0, 4).map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            if (alert.targetId && superAdmin?.setSelectedClinicId) {
                              superAdmin.setSelectedClinicId(alert.targetId);
                            }
                            onNavigate?.(alert.targetTab);
                          }}
                          className="py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
                              {alert.severity}
                            </span>
                            {alert.createdAt && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {alert.createdAt.slice(0, 10)}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-normal">
                            {alert.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                ) : userNotifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No notifications
                  </div>
                ) : (
                  <div className="py-1 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {userNotifications.slice(0, 4).map((notif) => (
                      <div key={notif.id} className="py-2.5 px-2">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* View All Notifications Link - Navigates directly to full module */}
                <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      if (isSuperAdmin) {
                        onNavigate?.('super_alerts');
                      }
                    }}
                    className="w-full py-2 px-3 text-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>View all notifications</span>
                    {isSuperAdmin && superAdminAlerts.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono">
                        +{superAdminAlerts.length - 4} more
                      </span>
                    )}
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown Container: Avatar, Name, Hospital Line */}
          <div className={`relative pl-2.5 ${isSuperAdmin ? 'border-l border-white/25' : 'border-l border-slate-200 dark:border-slate-700'}`} ref={dropdownRef}>
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
              className={`flex items-center gap-2 text-left cursor-pointer outline-none p-0 m-0 border-0 bg-transparent group ${
                isSuperAdmin ? 'focus-visible:ring-2 focus-visible:ring-white rounded-lg p-0.5' : 'focus:outline-none focus:ring-0'
              }`}
              aria-label="User profile menu"
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
              aria-controls="user-menu"
            >
              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                isSuperAdmin
                  ? 'bg-[var(--superadmin-avatar-bg)] ring-1 ring-white/30 border border-white/20'
                  : 'bg-teal-600 ring-1 ring-teal-500/30'
              }`}>
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : (isSuperAdmin ? 'P' : 'U')}
              </div>
              {BRAND_CONFIG.showHeaderUserBlock && (
                <div className="hidden md:flex flex-col justify-center min-w-0 pr-0 mr-0">
                  <span className={`font-semibold text-xs tracking-tight truncate leading-tight ${
                    isSuperAdmin ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {isSuperAdmin ? (currentUser?.name || 'Platform Super Admin') : (currentUser?.name || 'Dr. Administrator')}
                  </span>
                  <span className={`text-[10px] font-medium tracking-tight truncate leading-tight ${
                    isSuperAdmin ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {isSuperAdmin ? 'SOEZY CMS' : BRAND_CONFIG.hospitalName}
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
                    {currentUser?.email || 'user@beaconclinic.com'}
                  </div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 truncate">
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
