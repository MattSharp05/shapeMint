import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Register } from './Register';
import userEvent from '@testing-library/user-event'

// Use shared auth via test-utils but override register implementation
const mockRegister = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister
  })
}))

describe('Register Page', () => {
  it('renders expected fields', () => {
    render(<Register />);

    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
  });

  it('handles client-side validation error', async () => {
    render(<Register />);

    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/Password must be at least 6 characters long/i)).toBeInTheDocument();
  });
}); 