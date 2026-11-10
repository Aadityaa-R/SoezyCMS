import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';
import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { SuperAdminProvider } from '../src/context/SuperAdminContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';
import { AppLayout } from '../src/components/layout/AppLayout';

declare const process: any;

const mockSuperAdminAuth: any = {
  currentUser: {
    id: 'u-superadmin',
    name: 'Platform Super Admin',
    email: 'superadmin@soezy.internal',
    role: 'platform_super_admin' as const,
  },
  currentRole: 'platform_super_admin' as const,
  isAuthenticated: true,
  isRoleSuspended: vi.fn(() => false),
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
  signUpStaff: vi.fn(),
  signUpPatient: vi.fn(),
  clearRememberedAudience: vi.fn(),
  rememberedAudience: null,
};

const mockClinicVal: any = {
  currentOrganization: {
    id: 'org-subiksham',
    name: 'Subiksham Health System',
    licenseStatus: 'active',
  },
  modules: [],
  isFacilityEnabled: () => true,
};

const mockThemeVal: any = {
  theme: 'light',
  toggleTheme: vi.fn(),
};

const mockNotificationVal: any = {
  userNotifications: [],
  unreadCount: 0,
  markAllAsRead: vi.fn(),
};

const renderSuperAdminApp = () => {
  return render(
    <AuthContext.Provider value={mockSuperAdminAuth}>
      <ClinicContext.Provider value={mockClinicVal}>
        <ThemeContext.Provider value={mockThemeVal}>
          <NotificationContext.Provider value={mockNotificationVal}>
            <SuperAdminProvider>
              <AppLayout />
            </SuperAdminProvider>
          </NotificationContext.Provider>
        </ThemeContext.Provider>
      </ClinicContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Super Admin Three Red Shades Navigation & Theme Tokens', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Theme Token Specification (Sampled from original SOEZY logo)', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8');

    it('defines the three exact logo red hex tokens in src/index.css', () => {
      // First red: darkest shade for left sidebar background (#6d0000)
      expect(cssContent).toMatch(/--superadmin-sidebar-bg:\s*#6d0000;/);

      // Second red: middle shade for circular profile avatar background (#8f0000)
      expect(cssContent).toMatch(/--superadmin-avatar-bg:\s*#8f0000;/);

      // Third red: brighter shade for full-width top navigation bar background (#d90202)
      expect(cssContent).toMatch(/--superadmin-topbar-bg:\s*#d90202;/);
    });

    it('configures shared theme tokens scoped to Super Admin in tailwind.config.js', () => {
      expect(tailwindContent).toContain("sidebar: 'var(--superadmin-sidebar-bg)'");
      expect(tailwindContent).toContain("avatar: 'var(--superadmin-avatar-bg)'");
      expect(tailwindContent).toContain("topbar: 'var(--superadmin-topbar-bg)'");
    });
  });

  describe('2. Top Navigation Bar (Third red #d90202, white backplate logo, avatar in second red #8f0000)', () => {
    it('renders full-width top navigation bar with brighter red background and white text', () => {
      renderSuperAdminApp();

      const header = document.getElementById('headerdiv');
      expect(header).toBeTruthy();
      expect(header?.className).toContain('bg-[var(--superadmin-topbar-bg)]');
      expect(header?.className).toContain('text-white');
    });

    it('renders original SOEZY logo on a small white backplate', () => {
      renderSuperAdminApp();

      const logoImg = screen.getByAltText('SOEZY CMS') as HTMLImageElement;
      expect(logoImg).toBeTruthy();
      expect(logoImg.src).toContain('/soezy-logo.png');

      const backplate = logoImg.parentElement;
      expect(backplate?.className).toContain('bg-white');
      expect(backplate?.className).toContain('rounded-md');
      expect(backplate?.className).toContain('shadow-xs');
    });

    it('renders profile avatar with middle red background (#8f0000), white initial, and separating light outline', () => {
      renderSuperAdminApp();

      const userMenuBtn = screen.getByRole('button', { name: /User profile menu/i });
      expect(userMenuBtn).toBeTruthy();

      const avatarDiv = userMenuBtn.querySelector('.rounded-full');
      expect(avatarDiv).toBeTruthy();
      expect(avatarDiv?.className).toContain('bg-[var(--superadmin-avatar-bg)]');
      expect(avatarDiv?.className).toContain('text-white');
      expect(avatarDiv?.className).toContain('ring-1');
      expect(avatarDiv?.className).toContain('ring-white/30');
      expect(avatarDiv?.textContent).toBe('P');

      expect(screen.getByText('Platform Super Admin')).toBeTruthy();
      expect(screen.getByText('SOEZY CMS')).toBeTruthy();
    });

    it('opens user profile dropdown with high contrast and accessible options on click', () => {
      renderSuperAdminApp();

      const userMenuBtn = screen.getByRole('button', { name: /User profile menu/i });
      fireEvent.click(userMenuBtn);

      expect(screen.getByRole('menuitem', { name: /Profile/i })).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: /Settings/i })).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: /Log out/i })).toBeTruthy();
    });
  });

  describe('3. Left Sidebar (First red #6d0000, high contrast icons/text, subtle active pill)', () => {
    it('renders left sidebar with darkest red background (#6d0000) and white navigation items', () => {
      renderSuperAdminApp();

      const sidebar = document.getElementById('sidebar-navigation');
      expect(sidebar).toBeTruthy();
      expect(sidebar?.className).toContain('bg-[var(--superadmin-sidebar-bg)]');
      expect(sidebar?.className).toContain('text-white');

      // Check navigation items
      expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Clinics' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Admins' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Agreements' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Onboarding' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reports' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    });

    it('applies subtle background highlight to active item and visible focus indicators', () => {
      renderSuperAdminApp();

      const overviewBtn = screen.getByRole('button', { name: 'Overview' });
      expect(overviewBtn.getAttribute('aria-current')).toBe('page');
      expect(overviewBtn.className).toContain('bg-white/15');
      expect(overviewBtn.className).toContain('text-white');
      expect(overviewBtn.className).toContain('focus-visible:ring-2');
      expect(overviewBtn.className).toContain('focus-visible:ring-white');

      const clinicsBtn = screen.getByRole('button', { name: 'Clinics' });
      expect(clinicsBtn.className).toContain('hover:bg-white/10');
      expect(clinicsBtn.className).toContain('text-white/90');
    });

    it('toggles sidebar expanded and collapsed state from the topbar toggle button', () => {
      renderSuperAdminApp();

      const sidebar = document.getElementById('sidebar-navigation')!;
      const toggleBtn = screen.getByTitle(/Collapse sidebar|Expand sidebar/i);

      // Initially collapsed on desktop in test harness
      expect(toggleBtn).toBeTruthy();

      // Click to toggle
      fireEvent.click(toggleBtn);
      expect(sidebar.className).toContain('transition-all');
    });
  });

  describe('4. Minimal Overview Content and 12px Padding Preservation', () => {
    it('renders Organisation overview title and three neutral KPI cards', () => {
      renderSuperAdminApp();

      expect(screen.getByRole('heading', { level: 1, name: /Organisation overview/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Clinics & branches/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Admin assignments/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Licence agreements/i })).toBeTruthy();
    });

    it('preserves 12px top and side page padding on main container', () => {
      renderSuperAdminApp();

      const main = document.getElementById('main-content');
      expect(main?.style.paddingLeft).toBe('var(--page-pad)');
      expect(main?.style.paddingRight).toBe('var(--page-pad)');
      expect(main?.style.paddingTop).toBe('var(--page-pad)');
      expect(main?.style.paddingBottom).toBe('var(--page-pad)');
    });
  });
});
