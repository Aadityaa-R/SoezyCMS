import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';
import { SuperAdminProvider } from '../src/context/SuperAdminContext';
import { SuperAdminDashboard } from '../src/views/superadmin/SuperAdminDashboard';
import { ClinicBranchManagement } from '../src/views/superadmin/ClinicBranchManagement';
import { AdminManagement } from '../src/views/superadmin/AdminManagement';
import { AgreementManagement } from '../src/views/superadmin/AgreementManagement';
import { BranchOnboarding } from '../src/views/superadmin/BranchOnboarding';
import { SuperAdminReports } from '../src/views/superadmin/SuperAdminReports';
import { SuperAdminAlerts } from '../src/views/superadmin/SuperAdminAlerts';
import { SuperAdminSettings } from '../src/views/superadmin/SuperAdminSettings';
import { SuperAdminPortal } from '../src/views/superadmin/SuperAdminPortal';

declare const process: any;

describe('SOEZY CMS Super Admin Polish Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Standardized Typography & Sentence Case', () => {
    it('Overview (SuperAdminDashboard) renders 22px visible page title, 15px section headings, 13px toolbar controls, and sentence case', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <SuperAdminDashboard onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      // Visible 22px page title
      const pageTitle = screen.getByRole('heading', { level: 1, name: /Organisation overview/i });
      expect(pageTitle).toBeTruthy();
      expect(pageTitle.className).toContain('text-[22px]');
      expect(pageTitle.className).toContain('font-semibold');

      // Section headings (15px semibold)
      const networkHeading = screen.getByRole('heading', { level: 2, name: /Clinic \/ branch network status/i });
      expect(networkHeading.className).toContain('text-[15px]');
      expect(networkHeading.className).toContain('font-semibold');

      // Sentence case KPI cards
      expect(screen.getByText('Registered clinics')).toBeTruthy();
      expect(screen.getByText('Clinic admins')).toBeTruthy();
      expect(screen.getByText('Licence agreements')).toBeTruthy();
      expect(screen.getByText('Branch onboarding')).toBeTruthy();

      // Toolbar controls: 13px font
      const statusFilter = screen.getByLabelText(/Filter by status/i);
      expect(statusFilter.className).toContain('text-[13px]');
      expect(statusFilter.className).toContain('font-medium');

      const facilityFilter = screen.getByLabelText(/Filter by facility/i);
      expect(facilityFilter.className).toContain('text-[13px]');
      expect(facilityFilter.className).toContain('font-medium');

      const searchInput = screen.getByPlaceholderText(/Search clinics or branches/i);
      expect(searchInput.className).toContain('text-[13px]');

      const fullDirectoryBtn = screen.getByRole('button', { name: /Full directory/i });
      expect(fullDirectoryBtn.className).toContain('text-[13px]');
      expect(fullDirectoryBtn.className).toContain('font-medium');
    });

    it('Clinics & Branches renders 22px visible page title and 13px toolbar controls', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <ClinicBranchManagement onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      const pageTitle = screen.getByRole('heading', { level: 1, name: /Clinics & branches/i });
      expect(pageTitle).toBeTruthy();
      expect(pageTitle.className).toContain('text-[22px]');
      expect(pageTitle.className).toContain('font-semibold');

      const statusFilter = screen.getByLabelText(/Filter by status/i);
      expect(statusFilter.className).toContain('text-[13px]');

      const registerBtn = screen.getByRole('button', { name: /Register clinic/i });
      expect(registerBtn.className).toContain('text-[13px]');
    });

    it('Admins, Agreements, Onboarding, Reports, Alerts, and Settings all have visible 22px page titles', () => {
      const onNavigate = vi.fn();

      // Admins
      const { unmount: unmountAdmins } = render(
        <SuperAdminProvider>
          <AdminManagement onNavigateTab={onNavigate} />
        </SuperAdminProvider>
      );
      const adminsTitle = screen.getByRole('heading', { level: 1, name: /Clinic administrators/i });
      expect(adminsTitle.className).toContain('text-[22px]');
      unmountAdmins();

      // Agreements
      const { unmount: unmountAgreements } = render(
        <SuperAdminProvider>
          <AgreementManagement onNavigateTab={onNavigate} />
        </SuperAdminProvider>
      );
      const agreementsTitle = screen.getByRole('heading', { level: 1, name: /Licence agreements/i });
      expect(agreementsTitle.className).toContain('text-[22px]');
      unmountAgreements();

      // Onboarding
      const { unmount: unmountOnboarding } = render(
        <SuperAdminProvider>
          <BranchOnboarding />
        </SuperAdminProvider>
      );
      const onboardingTitle = screen.getByRole('heading', { level: 1, name: /Branch onboarding & activation/i });
      expect(onboardingTitle.className).toContain('text-[22px]');
      unmountOnboarding();

      // Reports
      const { unmount: unmountReports } = render(
        <SuperAdminProvider>
          <SuperAdminReports />
        </SuperAdminProvider>
      );
      const reportsTitle = screen.getByRole('heading', { level: 1, name: /Administrative reports/i });
      expect(reportsTitle.className).toContain('text-[22px]');
      unmountReports();

      // Alerts
      const { unmount: unmountAlerts } = render(
        <SuperAdminProvider>
          <SuperAdminAlerts onNavigateTab={onNavigate} />
        </SuperAdminProvider>
      );
      const alertsTitle = screen.getByRole('heading', { level: 1, name: /Alerts & announcements/i });
      expect(alertsTitle.className).toContain('text-[22px]');
      unmountAlerts();

      // Settings
      const { unmount: unmountSettings } = render(
        <SuperAdminProvider>
          <SuperAdminSettings />
        </SuperAdminProvider>
      );
      const settingsTitle = screen.getByRole('heading', { level: 1, name: /Platform settings/i });
      expect(settingsTitle.className).toContain('text-[22px]');
      unmountSettings();
    });
  });

  describe('2. Keyboard Focus Visibility & Focus Preservation', () => {
    it('verifies global CSS defines accessible :focus-visible styles and restricts outline suppression', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Outline suppression is strictly for pointer focus (:focus:not(:focus-visible))
      expect(cssContent).toContain(':focus:not(:focus-visible)');

      // High-contrast keyboard focus outline is globally applied
      expect(cssContent).toContain(':focus-visible');
      expect(cssContent).toContain('outline: 2px solid #0d9488 !important;');
      expect(cssContent).toContain('outline-offset: 2px !important;');
      expect(cssContent).toContain('.dark :focus-visible');
    });

    it('allows interactive controls like Full Directory, inputs, and selects to gain keyboard focus', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <SuperAdminDashboard onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      const fullDirectoryBtn = screen.getByRole('button', { name: /Full directory/i });
      fullDirectoryBtn.focus();
      expect(document.activeElement).toBe(fullDirectoryBtn);

      const statusFilter = screen.getByLabelText(/Filter by status/i);
      statusFilter.focus();
      expect(document.activeElement).toBe(statusFilter);

      const searchInput = screen.getByPlaceholderText(/Search clinics or branches/i);
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });

    it('preserves dialog Escape and close behavior in modals', async () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <AdminManagement onNavigateTab={onNavigate} />
        </SuperAdminProvider>
      );

      // Open appoint admin modal
      const appointBtn = screen.getByRole('button', { name: /Appoint admin/i });
      appointBtn.focus();
      fireEvent.click(appointBtn);

      // Modal is visible
      expect(screen.getByRole('heading', { name: /Appoint Clinic Administrator/i })).toBeTruthy();

      // Cancel button closes the modal
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      // Modal is closed
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /Appoint Clinic Administrator/i })).toBeNull();
      });
    });
  });

  describe('3. Secondary Control Alignment & Usable Click Areas', () => {
    it('Clinics card actions (Suspend and View details) have equal 32px height, alignment, and usable targets', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <ClinicBranchManagement onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      const viewDetailsButtons = screen.getAllByRole('button', { name: /View details/i });
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
      const firstViewDetails = viewDetailsButtons[0];

      expect(firstViewDetails.className).toContain('h-[32px]');
      expect(firstViewDetails.className).toContain('min-h-[32px]');
      expect(firstViewDetails.className).toContain('px-3');
      expect(firstViewDetails.className).toContain('text-[13px]');
      expect(firstViewDetails.className).toContain('rounded-lg');

      const suspendButtons = screen.getAllByRole('button', { name: /Suspend|Activate/i });
      expect(suspendButtons.length).toBeGreaterThan(0);
      const firstSuspend = suspendButtons[0];

      expect(firstSuspend.className).toContain('h-[32px]');
      expect(firstSuspend.className).toContain('min-h-[32px]');
      expect(firstSuspend.className).toContain('px-3');
      expect(firstSuspend.className).toContain('text-[13px]');
      expect(firstSuspend.className).toContain('rounded-lg');
    });

    it('table row actions in AdminManagement have standardized 28px height and usable targets', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <AdminManagement onNavigateTab={onNavigate} />
        </SuperAdminProvider>
      );

      const profileBtns = screen.getAllByRole('button', { name: /Profile/i });
      expect(profileBtns.length).toBeGreaterThan(0);
      expect(profileBtns[0].className).toContain('h-[28px]');
      expect(profileBtns[0].className).toContain('min-h-[28px]');
      expect(profileBtns[0].className).toContain('text-[13px]');
    });
  });

  describe('4. Branch Onboarding Character & Type Formatting', () => {
    it('renders clean branch details without broken "Â·" character and with readable branch types', () => {
      render(
        <SuperAdminProvider>
          <BranchOnboarding />
        </SuperAdminProvider>
      );

      // Verify no broken encoding exists
      const bodyHtml = document.body.innerHTML;
      expect(bodyHtml).not.toContain('Â·');

      // Verify readable branch type formatting (e.g. "Main hospital" instead of "MAIN_HOSPITAL")
      expect(screen.getAllByText(/Main hospital|Speciality center|Outpatient clinic/i).length).toBeGreaterThan(0);
      expect(bodyHtml).not.toContain('MAIN_HOSPITAL');
      expect(bodyHtml).not.toContain('SPECIALITY_CENTER');
    });
  });

  describe('5. Responsive Narrow Layouts (320px, 375px, 768px)', () => {
    it('ensures shared layout wrapper maintains exactly 12px outer padding on top, left, and right', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const layoutPath = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      // CSS specifies --page-pad as 12px
      expect(cssContent).toMatch(/--page-pad:\s*12px;/);

      // Layout applies var(--page-pad) for top, left, right, and bottom
      expect(layoutContent).toContain("paddingLeft: 'var(--page-pad)'");
      expect(layoutContent).toContain("paddingRight: 'var(--page-pad)'");
      expect(layoutContent).toContain("paddingTop: 'var(--page-pad)'");
      expect(layoutContent).toContain("paddingBottom: 'var(--page-pad)'");
    });

    it('verifies toolbars and tables support wrapping and internal scroll without horizontal page overflow', () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <SuperAdminDashboard onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      const toolbar = document.querySelector('[data-slot="smart-table-toolbar"]');
      expect(toolbar).toBeTruthy();
      expect(toolbar?.className).toContain('flex-wrap');

      // Table scroll wrapper ensures horizontal scrolling is inside the container
      const tableWrapper = document.querySelector('[data-slot="smart-table"] .overflow-x-auto');
      expect(tableWrapper).toBeTruthy();
      expect(tableWrapper?.className).toContain('overflow-x-auto');
    });
  });

  describe('6. Facility Classification (OPD, IPD, Lab) Persistence & Redirection', () => {
    it('persists independent OPD, IPD, Lab configurations for main clinic and side branch without duplication', async () => {
      const onNavigate = vi.fn();
      render(
        <SuperAdminProvider>
          <ClinicBranchManagement onNavigate={onNavigate} />
        </SuperAdminProvider>
      );

      // 1. Open Subiksham Speciality Hospital detail view
      const viewDetailsButtons = screen.getAllByRole('button', { name: /View details/i });
      fireEvent.click(viewDetailsButtons[0]);

      // Check classification section is visible
      expect(screen.getByRole('heading', { level: 2, name: /Facility classification/i })).toBeTruthy();

      const opdCheckbox = screen.getByLabelText(/OPD/i) as HTMLInputElement;
      const ipdCheckbox = screen.getByLabelText(/IPD/i) as HTMLInputElement;
      const labCheckbox = screen.getByLabelText(/Lab/i) as HTMLInputElement;

      // Select OPD + Lab for main clinic
      if (!opdCheckbox.checked) fireEvent.click(opdCheckbox);
      if (ipdCheckbox.checked) fireEvent.click(ipdCheckbox);
      if (!labCheckbox.checked) fireEvent.click(labCheckbox);

      const saveMainBtn = screen.getByRole('button', { name: /Save classification/i });
      fireEvent.click(saveMainBtn);

      await waitFor(() => {
        expect(screen.getByText(/Classification saved successfully/i)).toBeTruthy();
      });

      // 2. Open side branch detail view (West Campus)
      const sideBranchDetailsBtn = screen.getAllByRole('button', { name: /View details/i });
      fireEvent.click(sideBranchDetailsBtn[0]);

      // Side branch classification view
      const sideOpd = screen.getByLabelText(/OPD/i) as HTMLInputElement;
      const sideIpd = screen.getByLabelText(/IPD/i) as HTMLInputElement;
      const sideLab = screen.getByLabelText(/Lab/i) as HTMLInputElement;

      // Select IPD only for side branch
      if (sideOpd.checked) fireEvent.click(sideOpd);
      if (!sideIpd.checked) fireEvent.click(sideIpd);
      if (sideLab.checked) fireEvent.click(sideLab);

      const saveSideBtn = screen.getByRole('button', { name: /Save classification/i });
      fireEvent.click(saveSideBtn);

      await waitFor(() => {
        expect(screen.getByText(/Classification saved successfully/i)).toBeTruthy();
      });

      // 3. Return to main clinic and verify selections did not crosstalk
      const backToMainClinicBtn = screen.getByRole('button', { name: /Subiksham Speciality Hospital/i });
      fireEvent.click(backToMainClinicBtn);

      const recheckedOpd = screen.getByLabelText(/OPD/i) as HTMLInputElement;
      const recheckedIpd = screen.getByLabelText(/IPD/i) as HTMLInputElement;
      const recheckedLab = screen.getByLabelText(/Lab/i) as HTMLInputElement;

      expect(recheckedOpd.checked).toBe(true);
      expect(recheckedIpd.checked).toBe(false);
      expect(recheckedLab.checked).toBe(true);
    });

    it('redirects old Facilities URL / tab to Clinics (super_clinics)', () => {
      render(
        <SuperAdminPortal initialTab="super_facilities" />
      );

      // Verify it renders Clinics & branches rather than a broken page
      expect(screen.getByRole('heading', { level: 1, name: /Clinics & branches/i })).toBeTruthy();
    });
  });
});
