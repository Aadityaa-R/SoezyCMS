import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuperAdminProvider, useSuperAdmin } from '../src/context/SuperAdminContext';
import { SuperAdminDashboard } from '../src/views/superadmin/SuperAdminDashboard';
import { getAllowedNavItems, isTabAllowed } from '../src/lib/navigation';
import React from 'react';

// Component to test SuperAdminContext role enforcement
const RoleEnforcementHarness: React.FC = () => {
  const { updateClinicFacilityEntitlement } = useSuperAdmin();
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const attemptSuperAdminManualToggle = async () => {
    try {
      await updateClinicFacilityEntitlement(
        'c-subiksham',
        'registration',
        { moduleEnabledStatus: false },
        'Super admin manual toggle attempt',
        'platform_super_admin'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred');
    }
  };

  const attemptBranchAdminToggle = async () => {
    try {
      await updateClinicFacilityEntitlement(
        'c-subiksham',
        'registration',
        { moduleEnabledStatus: true },
        'Branch admin operational adjustment',
        'admin'
      );
      setErrorMessage('Branch admin allowed');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred');
    }
  };

  return (
    <div>
      <button onClick={attemptSuperAdminManualToggle}>Super Admin Toggle Module</button>
      <button onClick={attemptBranchAdminToggle}>Branch Admin Toggle Module</button>
      <div data-testid="error-message">{errorMessage}</div>
    </div>
  );
};

describe('Super Admin Cleanup Phase 1 Verification', () => {
  it('enforces role restriction: blocks Super Admin from manually toggling individual modules', async () => {
    render(
      <SuperAdminProvider>
        <RoleEnforcementHarness />
      </SuperAdminProvider>
    );

    const superAdminToggleBtn = screen.getByRole('button', { name: 'Super Admin Toggle Module' });
    fireEvent.click(superAdminToggleBtn);

    const errorDiv = await screen.findByTestId('error-message');
    expect(errorDiv.textContent).toContain('Platform Super Admin cannot manually toggle individual operational modules');
  });

  it('preserves authorized branch admin access for module adjustments', async () => {
    render(
      <SuperAdminProvider>
        <RoleEnforcementHarness />
      </SuperAdminProvider>
    );

    const branchAdminToggleBtn = screen.getByRole('button', { name: 'Branch Admin Toggle Module' });
    fireEvent.click(branchAdminToggleBtn);

    const errorDiv = await screen.findByTestId('error-message');
    expect(errorDiv.textContent).toBe('Branch admin allowed');
  });

  it('removes super_facilities from platform_super_admin navigation and allowed tabs', () => {
    const navItems = getAllowedNavItems('platform_super_admin', null);
    const navItemIds = navItems.map((item) => item.id);
    expect(navItemIds).not.toContain('super_facilities');
    expect(navItemIds).toEqual([
      'super_dashboard',
      'super_clinics',
      'super_admins',
      'super_agreements',
      'super_onboarding',
      'super_reports',
      'super_settings',
    ]);

    expect(isTabAllowed('super_facilities', 'platform_super_admin', null)).toBe(false);
    expect(isTabAllowed('super_clinics', 'platform_super_admin', null)).toBe(true);
    expect(isTabAllowed('super_dashboard', 'platform_super_admin', null)).toBe(true);
    expect(isTabAllowed('super_admins', 'platform_super_admin', null)).toBe(true);
    expect(isTabAllowed('super_agreements', 'platform_super_admin', null)).toBe(true);
  });

  it('SuperAdminDashboard: simplified to KPI-only dashboard while facility classification remains in clinic details', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    // Overview contains page title and 3 KPI cards
    expect(screen.getByRole('heading', { level: 1, name: /Organisation overview/i })).toBeTruthy();
    expect(screen.getByText('Clinics & branches')).toBeTruthy();
    expect(screen.getByText('Admin assignments')).toBeTruthy();
    expect(screen.getByText('Licence agreements')).toBeTruthy();

    // Network table, filters, and extraneous sections are removed from Overview
    expect(screen.queryByLabelText(/Filter by Facility/i)).toBeNull();
    expect(screen.queryByLabelText(/Filter by Status/i)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Facilities/i })).toBeNull();
    expect(screen.queryByText('Branch onboarding')).toBeNull();
    expect(screen.queryByText('Facility adoption')).toBeNull();
  });
});
