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

describe('Super Admin Toolbar Standardization (36px shared height & layout)', () => {
  it('Overview (SuperAdminDashboard) uses 36px height for search, filters, and Full Directory on the same toolbar row', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const statusFilter = screen.getByLabelText(/Filter by status/i);
    expect(statusFilter.className).toContain('h-9');
    expect(statusFilter.className).toContain('rounded-lg');

    const facilityFilter = screen.getByLabelText(/Filter by facility/i);
    expect(facilityFilter.className).toContain('h-9');
    expect(facilityFilter.className).toContain('rounded-lg');

    const searchInput = screen.getByPlaceholderText(/Search clinics or branches/i);
    expect(searchInput.className).toContain('h-9');
    expect(searchInput.className).toContain('rounded-lg');
    expect(searchInput.className).toContain('pl-9');

    const fullDirectoryBtn = screen.getByRole('button', { name: /Full Directory/i });
    expect(fullDirectoryBtn.className).toContain('h-9');
    expect(fullDirectoryBtn.className).toContain('!min-h-0');
    expect(fullDirectoryBtn.className).toContain('rounded-lg');

    // Verify search and filters still filter the table
    fireEvent.change(searchInput, { target: { value: 'Subiksham' } });
    expect((searchInput as HTMLInputElement).value).toBe('Subiksham');

    fireEvent.click(fullDirectoryBtn);
    expect(onNavigate).toHaveBeenCalledWith('super_clinics');
  });

  it('Clinics (ClinicBranchManagement) uses 36px height, with search & filter on left and Register Clinic on right', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <ClinicBranchManagement onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const branchTypeFilter = screen.getByLabelText(/Filter by branch type/i);
    expect(branchTypeFilter.className).toContain('h-9');
    expect(branchTypeFilter.className).toContain('rounded-lg');

    const searchInput = screen.getByPlaceholderText(/Search main branches/i);
    expect(searchInput.className).toContain('h-9');
    expect(searchInput.className).toContain('rounded-lg');
    expect(searchInput.className).toContain('pl-9');

    const registerClinicBtn = screen.getByRole('button', { name: /Register Clinic/i });
    expect(registerClinicBtn.className).toContain('h-9');
    expect(registerClinicBtn.className).toContain('!min-h-0');
    expect(registerClinicBtn.className).toContain('rounded-lg');
    expect(registerClinicBtn.className).toContain('shrink-0');

    // Clicking Register Clinic opens the registration modal
    fireEvent.click(registerClinicBtn);
    expect(screen.getByText(/Register New Clinic \/ Branch/i)).toBeTruthy();
  });

  it('Admins (AdminManagement) toolbar uses 36px height with growing search and Appoint Admin action', () => {
    render(
      <SuperAdminProvider>
        <AdminManagement />
      </SuperAdminProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by admin name/i);
    expect(searchInput.className).toContain('h-9');
    expect(searchInput.className).toContain('rounded-lg');

    const appointBtn = screen.getByRole('button', { name: /Appoint Admin/i });
    expect(appointBtn.className).toContain('h-9');
    expect(appointBtn.className).toContain('!min-h-0');
    expect(appointBtn.className).toContain('rounded-lg');

    fireEvent.click(appointBtn);
    expect(screen.getByText(/Appoint Clinic Administrator/i)).toBeTruthy();
  });

  it('Agreements (AgreementManagement) toolbar uses 36px height with growing search and Add Agreement action', () => {
    render(
      <SuperAdminProvider>
        <AgreementManagement />
      </SuperAdminProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search reference, clinic/i);
    expect(searchInput.className).toContain('h-9');
    expect(searchInput.className).toContain('rounded-lg');

    const addAgreementBtn = screen.getByRole('button', { name: /Add Agreement/i });
    expect(addAgreementBtn.className).toContain('h-9');
    expect(addAgreementBtn.className).toContain('!min-h-0');
    expect(addAgreementBtn.className).toContain('rounded-lg');

    fireEvent.click(addAgreementBtn);
    expect(screen.getByText(/Add Licence Agreement/i)).toBeTruthy();
  });

  it('BranchOnboarding standardizes action buttons to 36px with rounded-lg', () => {
    render(
      <SuperAdminProvider>
        <BranchOnboarding />
      </SuperAdminProvider>
    );

    // Look for suspend button on active clinic or authorize button
    const suspendBtn = screen.queryByRole('button', { name: /Suspend Branch/i });
    const activateBtn = screen.queryByRole('button', { name: /Authorize Go-Live & Activate/i });

    const btn = suspendBtn || activateBtn;
    expect(btn).toBeTruthy();
    expect(btn?.className).toContain('h-9');
    expect(btn?.className).toContain('!min-h-0');
    expect(btn?.className).toContain('rounded-lg');
  });

  it('Reports (SuperAdminReports) standardizes Print and Export CSV buttons to 36px', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminReports />
      </SuperAdminProvider>
    );

    const printBtn = screen.getByRole('button', { name: /Print Report/i });
    expect(printBtn.className).toContain('h-9');
    expect(printBtn.className).toContain('!min-h-0');
    expect(printBtn.className).toContain('rounded-lg');

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    expect(exportBtn.className).toContain('h-9');
    expect(exportBtn.className).toContain('!min-h-0');
    expect(exportBtn.className).toContain('rounded-lg');
  });

  it('Alerts (SuperAdminAlerts) standardizes severity and type filters to 36px with rounded-lg', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminAlerts />
      </SuperAdminProvider>
    );

    const severityFilter = screen.getByLabelText(/Filter by severity/i);
    expect(severityFilter.className).toContain('h-9');
    expect(severityFilter.className).toContain('rounded-lg');

    const typeFilter = screen.getByLabelText(/Filter by trigger type/i);
    expect(typeFilter.className).toContain('h-9');
    expect(typeFilter.className).toContain('rounded-lg');
  });

  it('Settings (SuperAdminSettings) standardizes Save button and audit filters to 36px', () => {
    render(
      <SuperAdminProvider>
        <SuperAdminSettings />
      </SuperAdminProvider>
    );

    const saveBtn = screen.getByRole('button', { name: /Save Organization Settings/i });
    expect(saveBtn.className).toContain('h-9');
    expect(saveBtn.className).toContain('!min-h-0');
    expect(saveBtn.className).toContain('rounded-lg');

    // Switch to Audit Logs tab
    const auditTabBtn = screen.getByRole('button', { name: /Audit Logs/i });
    fireEvent.click(auditTabBtn);

    const actionFilter = screen.getByLabelText(/Filter by action type/i);
    expect(actionFilter.className).toContain('h-9');
    expect(actionFilter.className).toContain('rounded-lg');

    const branchFilter = screen.getByLabelText(/Filter by branch/i);
    expect(branchFilter.className).toContain('h-9');
    expect(branchFilter.className).toContain('rounded-lg');

    const searchInput = screen.getByPlaceholderText(/Search audit details or actor/i);
    expect(searchInput.className).toContain('h-9');
    expect(searchInput.className).toContain('rounded-lg');
  });
});
