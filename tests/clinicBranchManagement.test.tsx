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

  it('clicking View Details on a main branch opens Main Branch Details with all required sections and linked side branches', () => {
    renderComponent();

    // Find View Details buttons for main branch cards
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]); // Subiksham

    // Section A: Main Branch Overview
    expect(screen.getByText(/Section A: Main Branch Overview/i)).toBeTruthy();
    expect(screen.getByText(/MED-REG-MH-2024-8849/)).toBeTruthy();

    // Section B: Side Branches table
    expect(screen.getByText(/Section B: Side Branches Grouped Under Subiksham Speciality Hospital/i)).toBeTruthy();
    expect(screen.getByText('Subiksham Oncology Center')).toBeTruthy();
    expect(screen.getByText('Subiksham Outpatient Wing (West Campus)')).toBeTruthy();
    expect(screen.getByText('Subiksham Diagnostics & Day Care')).toBeTruthy();

    // Section C: Agreement Details
    expect(screen.getByText(/Section C: Licence Agreement Details/i)).toBeTruthy();
    expect(screen.getByText('AGR-2025-SOEZY-SUB01')).toBeTruthy();

    // Section D: Facility Details
    expect(screen.getByText(/Section D: Facility Details/i)).toBeTruthy();

    // Section E: Onboarding Details
    expect(screen.getByText(/Section E: Branch Onboarding Details/i)).toBeTruthy();

    // Section F: Administrative Activity
    expect(screen.getByText(/Section F: Administrative Activity & Audit Trail/i)).toBeTruthy();
  });

  it('clicking a side branch in Section B opens its own details and provides back navigation', () => {
    renderComponent();

    // Open Subiksham details
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]);

    // Click View Details on Subiksham Oncology Center side branch
    const sideBranchViewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(sideBranchViewButtons[0]);

    // Side branch detail view
    expect(screen.getByText(/Affiliated Main Branch:/i)).toBeTruthy();
    expect(screen.getAllByText('Subiksham Oncology Center').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Back to Parent Main Branch/i })).toBeTruthy();

    // Click back to parent main branch
    fireEvent.click(screen.getByRole('button', { name: /Back to Parent Main Branch/i }));
    expect(screen.getByText(/Section B: Side Branches Grouped Under Subiksham Speciality Hospital/i)).toBeTruthy();
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
  });
});
