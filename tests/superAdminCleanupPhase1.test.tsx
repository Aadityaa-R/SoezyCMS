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

  it('SuperAdminDashboard: displays facility classifications in network table and limits facility filter options to All facilities, OPD, IPD, and Lab', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    // Facility filter options strictly limited to All facilities, OPD, IPD, Lab
    const facilitySelect = screen.getByLabelText(/Filter by Facility/i) as HTMLSelectElement;
    expect(facilitySelect).toBeTruthy();
    const options = Array.from(facilitySelect.options).map((o) => o.text);
    expect(options).toEqual(['All facilities', 'OPD', 'IPD', 'Lab']);

    // Network table headers: Location, Appointed Admin, Facilities, Agreement, Status
    expect(screen.getByText('FACILITIES')).toBeTruthy();
    expect(screen.getByText('APPOINTED ADMIN')).toBeTruthy();
    expect(screen.getByText('AGREEMENT')).toBeTruthy();

    // Table rows display formatted facility classifications (e.g., OPD, IPD, Lab) instead of "14 wings"
    expect(screen.queryByText(/14 wings/i)).toBeNull();
    expect(screen.getAllByText('OPD, IPD, Lab').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OPD, IPD').length).toBeGreaterThan(0);
  });
});
