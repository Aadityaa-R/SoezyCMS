import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClinicBranchManagement } from '../src/views/superadmin/ClinicBranchManagement';
import { SuperAdminProvider } from '../src/context/SuperAdminContext';

const renderComponent = () => {
  const onNavigate = vi.fn();
  return {
    ...render(
      <SuperAdminProvider>
        <ClinicBranchManagement onNavigate={onNavigate} />
      </SuperAdminProvider>
    ),
    onNavigate,
  };
};

describe('ClinicBranchManagement - Card-Based Hierarchy & Pagination', () => {
  it('displays exactly 3 main branch cards on page 1 without side branches at top-level', () => {
    renderComponent();

    // Verify main branches are present
    expect(screen.getByText('Subiksham Speciality Hospital')).toBeTruthy();
    expect(screen.getByText('Beacon Health Medical Center')).toBeTruthy();
    expect(screen.getByText('Apex Metro Memorial Hospital')).toBeTruthy();

    // Verify side branches are NOT top-level cards on page 1
    expect(screen.queryByText('Subiksham Oncology Center')).toBeNull();
    expect(screen.queryByText('Subiksham Outpatient Wing (West Campus)')).toBeNull();

    // Verify dynamic side branch count on card
    expect(screen.getByText(/3 side branches/i)).toBeTruthy();

    // Verify pagination text: Showing 1–3 of 5 main branches
    expect(screen.getByText(/Showing 1[–-]3 of 5 main branches/i)).toBeTruthy();
  });

  it('navigates to page 2 when Next is clicked and displays remaining main branches', () => {
    renderComponent();

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeTruthy();

    fireEvent.click(nextBtn);

    // Page 2 shows Horizon and St. Jude
    expect(screen.getByText('Horizon Multi-Speciality Medical Center')).toBeTruthy();
    expect(screen.getByText('St. Jude Community Health Network')).toBeTruthy();

    // Page 1 cards are not on page 2
    expect(screen.queryByText('Subiksham Speciality Hospital')).toBeNull();

    // Pagination text updates
    expect(screen.getByText(/Showing 4[–-]5 of 5 main branches/i)).toBeTruthy();
  });

  it('counts on filter tabs represent Main Branches only', () => {
    renderComponent();

    // Total main branches = 5
    expect(screen.getByRole('button', { name: /All Clinics \(5\)/i })).toBeTruthy();
    // Active main branches = 3 (Subiksham, Beacon, Apex)
    expect(screen.getByRole('button', { name: /Active \(3\)/i })).toBeTruthy();
    // Pending main branches = 1 (Horizon)
    expect(screen.getByRole('button', { name: /Pending \(1\)/i })).toBeTruthy();
    // Inactive main branches = 1 (St. Jude)
    expect(screen.getByRole('button', { name: /Inactive \/ Suspended \(1\)/i })).toBeTruthy();
  });

  it('clicking View Details on a main branch opens Main Branch Details with all required sections and linked side branches matching mockup', () => {
    renderComponent();

    // Find View Details buttons for main branch cards
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]); // Subiksham Speciality Hospital

    // Breadcrumb
    expect(screen.getByRole('button', { name: 'Clinics' })).toBeTruthy();
    expect(screen.getAllByText('Subiksham Speciality Hospital').length).toBeGreaterThan(0);

    // Card 1: Inline Facility Classification matching mockup
    expect(screen.getByText('Facility Classification')).toBeTruthy();
    expect(screen.getByText('Choose the services offered at this location.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save classification/i })).toBeTruthy();
    expect(screen.getByText('Automatically enabled')).toBeTruthy();

    // Card 2: Side branches table
    expect(screen.getByText('Side branches')).toBeTruthy();
    expect(screen.getByText('Subiksham Oncology Center')).toBeTruthy();
    expect(screen.getByText('Subiksham Outpatient Wing (West Campus)')).toBeTruthy();
    expect(screen.getByText('Subiksham Diagnostics & Day Care')).toBeTruthy();

    // Administrative sections
    expect(screen.getByText('Main Branch Administrative Details')).toBeTruthy();
    expect(screen.getByText('Licence Agreement Details')).toBeTruthy();
    expect(screen.getByText('AGR-2025-SOEZY-SUB01')).toBeTruthy();
    expect(screen.getByText(/Branch Onboarding Details/i)).toBeTruthy();
    expect(screen.getByText(/Administrative Activity/i)).toBeTruthy();
  });

  it('clicking a side branch opens its own details with independent classification and provides breadcrumb back navigation', () => {
    renderComponent();

    // Open Subiksham details
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]);

    // Click View Details on Subiksham Oncology Center side branch in the Side branches table
    const sideBranchViewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(sideBranchViewButtons[0]);

    // Side branch detail view
    expect(screen.getAllByText('Subiksham Oncology Center').length).toBeGreaterThan(0);
    expect(screen.getByText('Facility Classification')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save classification/i })).toBeTruthy();

    // Breadcrumb navigation back to parent main branch
    const parentBreadcrumbBtn = screen.getByRole('button', { name: 'Subiksham Speciality Hospital' });
    expect(parentBreadcrumbBtn).toBeTruthy();
    fireEvent.click(parentBreadcrumbBtn);

    // Now back on Subiksham Speciality Hospital details
    expect(screen.getByText('Side branches')).toBeTruthy();
    expect(screen.getByText('Subiksham Oncology Center')).toBeTruthy();

    // Breadcrumb navigation back to Clinics list
    const clinicsBreadcrumbBtn = screen.getByRole('button', { name: 'Clinics' });
    expect(clinicsBreadcrumbBtn).toBeTruthy();
    fireEvent.click(clinicsBreadcrumbBtn);

    // Now back on main branch card listing
    expect(screen.getByText(/Showing 1[–-]3 of 5 main branches/i)).toBeTruthy();
  });

  it('resets pagination to page 1 when search or tab filters change', () => {
    renderComponent();

    // Go to page 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Showing 4[–-]5 of 5 main branches/i)).toBeTruthy();

    // Search for Subiksham
    const searchInput = screen.getByPlaceholderText(/Search main branches.../i);
    fireEvent.change(searchInput, { target: { value: 'Subiksham' } });

    // Should reset to page 1 and show only Subiksham
    expect(screen.getByText(/Showing 1[–-]1 of 1 main branches/i)).toBeTruthy();
    expect(screen.getByText('Subiksham Speciality Hospital')).toBeTruthy();
  });

  it('supports registering a new clinic with hierarchy choice between Main Branch and Side Branch', async () => {
    renderComponent();

    // Open Register Modal
    fireEvent.click(screen.getByRole('button', { name: /Register Clinic/i }));

    expect(screen.getByText(/Branch Hierarchy Type/i)).toBeTruthy();
    expect(screen.getByLabelText(/Main Branch/i)).toBeTruthy();
    expect(screen.getByLabelText(/Side Branch/i)).toBeTruthy();

    // Toggle to Side Branch
    fireEvent.click(screen.getByLabelText(/Side Branch/i));

    // Shows parent main branch selection
    expect(screen.getByText(/Select Parent Main Branch/i)).toBeTruthy();
    expect(screen.getByText('-- Choose Parent Main Branch --')).toBeTruthy();

    // Verify facility classification checkboxes (OPD, IPD, Lab) in registration form
    expect(screen.getAllByText(/Facility Classification/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: /OPD/i })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /IPD/i })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Lab/i })).toBeTruthy();
  });

  it('displays facility classifications on main branch cards', () => {
    renderComponent();

    // Cards display facility classifications
    expect(screen.getAllByText(/Facility Classification/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Automated Modules/i).length).toBeGreaterThan(0);
    // Subiksham has OPD, IPD, Lab
    expect(screen.getAllByText('OPD, IPD, Lab').length).toBeGreaterThan(0);
  });

  it('displays side branch independent classification and allows inline editing and saving', async () => {
    renderComponent();

    // Open Subiksham details
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]);

    // Side branches table shows independent classifications
    expect(screen.getByText('OPD, IPD')).toBeTruthy(); // Subiksham Oncology Center
    expect(screen.getAllByText('OPD').length).toBeGreaterThan(0); // West Campus and checkbox

    // Main branch has inline Facility Classification card
    expect(screen.getByText('Facility Classification')).toBeTruthy();
    const saveBtn = screen.getByRole('button', { name: /Save classification/i });
    expect(saveBtn).toBeTruthy();

    // Save classification
    fireEvent.click(saveBtn);
    expect(await screen.findByText(/Classification saved successfully/i)).toBeTruthy();
  });

  it('allows side branch classification to be updated independently without altering the parent main branch', async () => {
    renderComponent();

    // Open Subiksham main branch details
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]);

    // Open Subiksham Oncology Center side branch
    const sideBranchViewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(sideBranchViewButtons[0]);

    // Side branch detail view has its own Save classification button
    expect(screen.getAllByText('Subiksham Oncology Center').length).toBeGreaterThan(0);
    const saveSideBtn = screen.getByRole('button', { name: /Save classification/i });
    expect(saveSideBtn).toBeTruthy();

    // Save side branch classification
    fireEvent.click(saveSideBtn);
    expect(await screen.findByText(/Classification saved successfully/i)).toBeTruthy();

    // Return to parent main branch
    fireEvent.click(screen.getByRole('button', { name: 'Subiksham Speciality Hospital' }));
    expect(screen.getByText('Side branches')).toBeTruthy();
  });
});
