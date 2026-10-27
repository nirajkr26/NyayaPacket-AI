import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import * as AuthContextModule from '../../context/AuthContext';

describe('LoginPage', () => {
  it('renders login form and shows validation/api error message on failure', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid email or password'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Log in to NyayaPacket AI/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Log in/i });

    // Submit with empty inputs
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/Please fill in all fields/i)).toBeInTheDocument();

    // Type credentials and submit
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'badpassword' },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'wrong@example.com',
        password: 'badpassword',
      });
    });

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
