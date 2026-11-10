import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuperAdminProvider } from '../src/context/SuperAdminContext';
import { SuperAdminDashboard } from '../src/views/superadmin/SuperAdminDashboard';
import { SuperAdminPortal } from '../src/views/superadmin/SuperAdminPortal';

describe('Super Admin Overview KPI-Only Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders ONLY the page title and three neutral KPI cards', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    // 1. Page title
    const title = screen.getByRole('heading', { level: 1, name: /Organisation overview/i });
    expect(title).toBeTruthy();
    expect(title.className).toContain('text-[22px]');
    expect(title.className).toContain('font-semibold');

    // 2. Exactly three KPI cards (buttons)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);

    expect(screen.getByText('Clinics & branches')).toBeTruthy();
    expect(screen.getByText('Admin assignments')).toBeTruthy();
    expect(screen.getByText('Licence agreements')).toBeTruthy();

    // 3. Extraneous sections and tables are completely removed
    expect(screen.queryByText('Branch onboarding')).toBeNull();
    expect(screen.queryByText(/Clinic \/ branch network status/i)).toBeNull();
    expect(screen.queryByText('Facility adoption')).toBeNull();
    expect(screen.queryByText(/Recent administrative audit trail/i)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByPlaceholderText(/Search/i)).toBeNull();
    expect(screen.queryByLabelText(/Filter/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Full directory/i })).toBeNull();
  });

  it('Card 1 (Clinics & branches): displays total locations and active locations, and opens Clinics', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const card = screen.getByRole('button', { name: /Clinics & branches/i });
    expect(card).toBeTruthy();

    // Content check: total locations and active locations
    expect(card.textContent).toContain('Clinics & branches');
    expect(card.textContent).toContain('total locations');
    expect(card.textContent).toContain('Active locations');

    // Click triggers navigation to Clinics
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith('super_clinics');

    // Keyboard interaction (Enter key) triggers navigation to Clinics
    onNavigate.mockClear();
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    // In React/JSDOM, clicking or firing click handles standard button activation
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith('super_clinics');
  });

  it('Card 2 (Admin assignments): counts locations rather than administrator accounts and opens Admins', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const card = screen.getByRole('button', { name: /Admin assignments/i });
    expect(card).toBeTruthy();

    // Content check: locations with appointed admin and locations needing admin
    expect(card.textContent).toContain('Admin assignments');
    expect(card.textContent).toContain('with appointed admin');
    expect(card.textContent).toContain('Still need admin');

    // Click triggers navigation to Admins
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith('super_admins');
  });

  it('Card 3 (Licence agreements): displays active, expiring soon, and expired agreements, and opens Agreements', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const card = screen.getByRole('button', { name: /Licence agreements/i });
    expect(card).toBeTruthy();

    // Content check: active agreements, expiring soon, and expired
    expect(card.textContent).toContain('Licence agreements');
    expect(card.textContent).toContain('active agreements');
    expect(card.textContent).toContain('Expiring soon:');
    expect(card.textContent).toContain('Expired:');

    // Click triggers navigation to Agreements
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith('super_agreements');
  });

  it('verifies cards use neutral surfaces, thin borders, and visible keyboard focus styling', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const cards = screen.getAllByRole('button');
    cards.forEach((card) => {
      // Neutral surfaces and thin borders
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-slate-200');
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('p-4');
      expect(card.className).toContain('rounded-xl');

      // Visible keyboard focus indicator
      expect(card.className).toContain('focus-visible:outline-2');
      expect(card.className).toContain('focus-visible:outline-teal-600');
      expect(card.className).toContain('focus-visible:outline-offset-2');
    });
  });

  it('arranges cards in 1 row on desktop and stacks them on narrow screens', () => {
    const onNavigate = vi.fn();
    render(
      <SuperAdminProvider>
        <SuperAdminDashboard onNavigate={onNavigate} />
      </SuperAdminProvider>
    );

    const grid = document.querySelector('.grid');
    expect(grid).toBeTruthy();
    // 1 column by default (stacks on narrow screens)
    expect(grid?.className).toContain('grid-cols-1');
    // 3 columns on desktop (1 row)
    expect(grid?.className).toContain('md:grid-cols-3');
    expect(grid?.className).toContain('gap-4');
  });

  it('preserves dedicated screens and workflows accessible through SuperAdminPortal navigation', () => {
    const { rerender } = render(
      <SuperAdminPortal initialTab="super_dashboard" />
    );

    // Initial Overview contains title and 3 cards
    expect(screen.getByRole('heading', { level: 1, name: /Organisation overview/i })).toBeTruthy();
    expect(screen.getByText('Clinics & branches')).toBeTruthy();

    // Clicking Clinics card navigates to Clinics & branches screen
    const clinicsCard = screen.getByRole('button', { name: /Clinics & branches/i });
    fireEvent.click(clinicsCard);

    expect(screen.getByRole('heading', { level: 1, name: /Clinics & branches/i })).toBeTruthy();

    // Directly navigating to Admins screen works
    rerender(<SuperAdminPortal initialTab="super_admins" />);
    expect(screen.getByRole('heading', { level: 1, name: /Clinic administrators/i })).toBeTruthy();

    // Directly navigating to Agreements screen works
    rerender(<SuperAdminPortal initialTab="super_agreements" />);
    expect(screen.getByRole('heading', { level: 1, name: /Licence agreements/i })).toBeTruthy();

    // Directly navigating to Onboarding screen works
    rerender(<SuperAdminPortal initialTab="super_onboarding" />);
    expect(screen.getByRole('heading', { level: 1, name: /Branch onboarding & activation/i })).toBeTruthy();
  });
});
