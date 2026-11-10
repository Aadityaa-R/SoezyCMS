import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuperAdminProvider } from '../src/context/SuperAdminContext';
import { SuperAdminDashboard } from '../src/views/superadmin/SuperAdminDashboard';
import { ClinicBranchManagement } from '../src/views/superadmin/ClinicBranchManagement';
import { AdminManagement } from '../src/views/superadmin/AdminManagement';
import { AgreementManagement } from '../src/views/superadmin/AgreementManagement';
import { SuperAdminReports } from '../src/views/superadmin/SuperAdminReports';
import { SuperAdminAlerts } from '../src/views/superadmin/SuperAdminAlerts';
import { SuperAdminSettings } from '../src/views/superadmin/SuperAdminSettings';
import { BranchOnboarding } from '../src/views/superadmin/BranchOnboarding';

describe('Super Admin Toolbar & Filter Cleanup (Dropdowns, Exact 36px, True Navigation)', () => {
  it('Overview (SuperAdminDashboard) is a KPI-only dashboard without table toolbars', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    // Overview renders title and 3 KPI cards
    expect(screen.getByRole('heading', { level: 1, name: /Organisation overview/i })).toBeTruthy();
    expect(screen.getByText('Clinics & branches')).toBeTruthy();
    expect(screen.getByText('Admin assignments')).toBeTruthy();
    expect(screen.getByText('Licence agreements')).toBeTruthy();

    // Table toolbar controls are removed from Overview
    expect(screen.queryByLabelText(/Filter by status/i)).toBeNull();
    expect(screen.queryByLabelText(/Filter by facility/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/Search clinics or branches/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Full Directory/i })).toBeNull();
  });

  it('Clinics (ClinicBranchManagement) converts status button row to a labeled dropdown filter with counts and exact 36px height', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <ClinicBranchManagement onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    // Status filter is a dropdown filter
    const statusFilter = screen.getByLabelText(/Filter by status/i) as HTMLSelectElement;
    expect(statusFilter.tagName).toBe('SELECT');
    expect(statusFilter.className).toContain('h-[36px]');
    expect(statusFilter.className).toContain('min-h-[36px]');
    expect(statusFilter.className).toContain('rounded-lg');

    // Options preserve counts and start with All statuses
    expect(screen.getByRole('option', { name: /All statuses \(5\)/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Active \(3\)/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Pending \(1\)/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Inactive \/ Suspended \(1\)/i })).toBeTruthy();

    const branchTypeFilter = screen.getByLabelText(/Filter by branch type/i);
    expect(branchTypeFilter.className).toContain('h-[36px]');
    expect(branchTypeFilter.className).toContain('min-h-[36px]');

    const searchInput = screen.getByPlaceholderText(/Search main branches/i);
    expect(searchInput.className).toContain('h-[36px]');
    expect(searchInput.className).toContain('min-h-[36px]');

    const registerClinicBtn = screen.getByRole('button', { name: /Register Clinic/i });
    expect(registerClinicBtn.className).toContain('h-[36px]');
    expect(registerClinicBtn.className).toContain('min-h-[36px]');
    expect(registerClinicBtn.className).toContain('!min-h-0');

    // Test filter narrowing
    fireEvent.change(statusFilter, { target: { value: 'active' } });
    expect(statusFilter.value).toBe('active');
    expect(screen.getByText(/Showing 1[–-]3 of 3 main branches/i)).toBeTruthy();

    // Reset filter restores full list
    fireEvent.change(statusFilter, { target: { value: 'all' } });
    expect(statusFilter.value).toBe('all');
    expect(screen.getByText(/Showing 1[–-]3 of 5 main branches/i)).toBeTruthy();
  });

  it('Admins (AdminManagement) converts status buttons to a labeled dropdown filter with unassigned queue support', () => {
    render(
      <SuperAdminProvider>
        <AdminManagement />
      </SuperAdminProvider>
    );

    const statusFilter = screen.getByLabelText(/Filter by status/i) as HTMLSelectElement;
    expect(statusFilter.tagName).toBe('SELECT');
    expect(statusFilter.className).toContain('h-[36px]');
    expect(statusFilter.className).toContain('min-h-[36px]');

    // Preserves counts in dropdown options
    expect(screen.getByRole('option', { name: /^All statuses/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /^Active \(/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Unassigned Clinics/i })).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search by admin name/i);
    expect(searchInput.className).toContain('h-[36px]');
    expect(searchInput.className).toContain('min-h-[36px]');

    const appointBtn = screen.getByRole('button', { name: /Appoint Admin/i });
    expect(appointBtn.className).toContain('h-[36px]');
    expect(appointBtn.className).toContain('min-h-[36px]');

    // Test selecting Unassigned Clinics queue
    fireEvent.change(statusFilter, { target: { value: 'unassigned' } });
    expect(statusFilter.value).toBe('unassigned');
    expect(screen.getByText(/Clinics Without Appointed Administrator/i)).toBeTruthy();

    // Resetting restores table view
    fireEvent.change(statusFilter, { target: { value: 'all' } });
    expect(statusFilter.value).toBe('all');
    expect(screen.getByText(/Meera Krishnan/i)).toBeTruthy();
  });

  it('Agreements (AgreementManagement) converts status buttons to a labeled dropdown filter with exact 36px height', () => {
    render(
      <SuperAdminProvider>
        <AgreementManagement />
      </SuperAdminProvider>
    );

    const statusFilter = screen.getByLabelText(/Filter by status/i) as HTMLSelectElement;
    expect(statusFilter.tagName).toBe('SELECT');
    expect(statusFilter.className).toContain('h-[36px]');
    expect(statusFilter.className).toContain('min-h-[36px]');

    expect(screen.getByRole('option', { name: /^All statuses/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /^Active/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Expiring Soon/i })).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search reference, clinic/i);
    expect(searchInput.className).toContain('h-[36px]');
    expect(searchInput.className).toContain('min-h-[36px]');

    const addAgreementBtn = screen.getByRole('button', { name: /Add Agreement/i });
    expect(addAgreementBtn.className).toContain('h-[36px]');
    expect(addAgreementBtn.className).toContain('min-h-[36px]');

    // Filter by active
    fireEvent.change(statusFilter, { target: { value: 'active' } });
    expect(statusFilter.value).toBe('active');

    // Reset filter
    fireEvent.change(statusFilter, { target: { value: 'all' } });
    expect(statusFilter.value).toBe('all');
  });

  it('BranchOnboarding converts pipeline button row to labeled dropdown filter', () => {
    render(
      <SuperAdminProvider>
        <BranchOnboarding />
      </SuperAdminProvider>
    );

    const onboardingFilter = screen.getByLabelText(/Filter by onboarding status/i) as HTMLSelectElement;
    expect(onboardingFilter.tagName).toBe('SELECT');
    expect(onboardingFilter.className).toContain('h-[36px]');
    expect(onboardingFilter.className).toContain('min-h-[36px]');

    expect(screen.getByRole('option', { name: /All statuses/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Pending/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /In Progress/i })).toBeTruthy();

    // Verify filter narrows queue
    fireEvent.change(onboardingFilter, { target: { value: 'completed' } });
    expect(onboardingFilter.value).toBe('completed');

    // Reset filter
    fireEvent.change(onboardingFilter, { target: { value: 'all' } });
    expect(onboardingFilter.value).toBe('all');
  });

  it('Reports (SuperAdminReports) preserves report switcher as true navigation tabs and uses exact 36px action buttons', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminReports />
      </SuperAdminProvider>
    );

    // True navigation remains tabs
    expect(screen.getByRole('button', { name: /1\. Branch Directory/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2\. Admin Assignments/i })).toBeTruthy();

    const printBtn = screen.getByRole('button', { name: /Print Report/i });
    expect(printBtn.className).toContain('h-[36px]');
    expect(printBtn.className).toContain('min-h-[36px]');

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    expect(exportBtn.className).toContain('h-[36px]');
    expect(exportBtn.className).toContain('min-h-[36px]');
  });

  it('Alerts (SuperAdminAlerts) preserves view switcher as tabs while standardizing dropdown filters and action to 36px', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminAlerts />
      </SuperAdminProvider>
    );

    // View switch remains tabs
    expect(screen.getByRole('button', { name: /Alerts \(/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Announcements \(/i })).toBeTruthy();

    const severityFilter = screen.getByLabelText(/Filter by severity/i);
    expect(severityFilter.className).toContain('h-[36px]');
    expect(severityFilter.className).toContain('min-h-[36px]');

    const typeFilter = screen.getByLabelText(/Filter by trigger type/i);
    expect(typeFilter.className).toContain('h-[36px]');
    expect(typeFilter.className).toContain('min-h-[36px]');
  });

  it('Settings (SuperAdminSettings) preserves Settings vs Audit Logs as navigation tabs and standardizes controls to 36px', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminSettings />
      </SuperAdminProvider>
    );

    // Navigation remains tabs
    const settingsTab = screen.getByRole('button', { name: /^Organization Settings$/i });
    const auditTab = screen.getByRole('button', { name: /Audit Logs/i });
    expect(settingsTab).toBeTruthy();
    expect(auditTab).toBeTruthy();

    const saveBtn = screen.getByRole('button', { name: /Save Organization Settings/i });
    expect(saveBtn.className).toContain('h-[36px]');
    expect(saveBtn.className).toContain('min-h-[36px]');

    // Switch to Audit Logs tab
    fireEvent.click(auditTab);

    const actionFilter = screen.getByLabelText(/Filter by action type/i);
    expect(actionFilter.className).toContain('h-[36px]');
    expect(actionFilter.className).toContain('min-h-[36px]');

    const branchFilter = screen.getByLabelText(/Filter by branch/i);
    expect(branchFilter.className).toContain('h-[36px]');
    expect(branchFilter.className).toContain('min-h-[36px]');

    const searchInput = screen.getByPlaceholderText(/Search audit details or actor/i);
    expect(searchInput.className).toContain('h-[36px]');
    expect(searchInput.className).toContain('min-h-[36px]');
  });
});
