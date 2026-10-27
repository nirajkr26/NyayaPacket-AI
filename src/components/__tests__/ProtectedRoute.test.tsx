import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthContextModule from '../../context/AuthContext';
import { AuthUser } from '../../types';

describe('ProtectedRoute', () => {
  const mockCitizen: AuthUser = {
    id: 'user-1',
    name: 'Aarav Sharma',
    email: 'aarav@citizen.in',
    role: 'citizen',
    isActive: true,
  };

  const mockLawyer: AuthUser = {
    id: 'user-2',
    name: 'Advocate Priya Roy',
    email: 'priya@lawyer.in',
    role: 'lawyer',
    barCouncilId: 'MAH/123/2018',
    isActive: true,
  };

  it('redirects to /login when user is not authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects to /not-allowed when user role is not authorized', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockCitizen, // Citizen trying to access lawyer route
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/lawyer-only']}>
        <Routes>
          <Route path="/not-allowed" element={<div>Access Denied Page</div>} />
          <Route
            path="/lawyer-only"
            element={
              <ProtectedRoute allowedRoles={['lawyer']}>
                <div>Lawyer Portal Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    expect(screen.queryByText('Lawyer Portal Content')).not.toBeInTheDocument();
  });

  it('renders content when user is authenticated with matching role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockLawyer,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/lawyer-only']}>
        <Routes>
          <Route path="/not-allowed" element={<div>Access Denied Page</div>} />
          <Route
            path="/lawyer-only"
            element={
              <ProtectedRoute allowedRoles={['lawyer']}>
                <div>Lawyer Portal Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Lawyer Portal Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });
});
