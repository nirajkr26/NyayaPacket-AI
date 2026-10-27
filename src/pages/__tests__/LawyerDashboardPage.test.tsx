import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LawyerDashboardPage } from '../LawyerDashboardPage';
import * as AuthContextModule from '../../context/AuthContext';
import { AuthUser } from '../../types';

describe('LawyerDashboardPage', () => {
  const mockLawyer: AuthUser = {
    id: 'lawyer-123',
    name: 'Advocate Priya Roy',
    email: 'priya@bar.in',
    role: 'lawyer',
    barCouncilId: 'MAH/5432/2018',
    isActive: true,
  };

  it('renders lawyer dashboard with 4 stat cards, shared cases with packet-ready chip, and explicit sharing disclaimer note', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockLawyer,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LawyerDashboardPage />
      </MemoryRouter>
    );

    // Welcome & Bar Council ID
    expect(screen.getByText(/Advocate Priya Roy/i)).toBeInTheDocument();
    expect(screen.getByText('MAH/5432/2018')).toBeInTheDocument();

    // 4 Stat Cards
    expect(screen.getByText('Cases shared with me')).toBeInTheDocument();
    expect(screen.getByText('Awaiting my review')).toBeInTheDocument();
    expect(screen.getByText('Consultations this week')).toBeInTheDocument();
    expect(screen.getByText('Open action items')).toBeInTheDocument();

    // Disclaimer notice
    expect(
      screen.getByText(/Lawyers only see cases that a citizen has explicitly shared with them/i)
    ).toBeInTheDocument();

    // Shared cases & Packet-ready chip
    expect(screen.getByText(/Shared cases/i)).toBeInTheDocument();
    expect(screen.getAllByText('Packet ready').length).toBeGreaterThan(0);
    expect(screen.getByText('Review queue')).toBeInTheDocument();
  });
});
