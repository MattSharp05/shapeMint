import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Dashboard } from './Dashboard';
import userEvent from '@testing-library/user-event'

// Use shared auth mock via test-utils

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
  }
}));

describe('Dashboard Page', () => {
  it('renders the page with expected content', () => {
    render(<Dashboard />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your designs/i)).toBeInTheDocument();
  });

  it('handles order refresh action', async () => {
    render(<Dashboard />);

    const refreshButton = screen.getByRole('button', { name: /Refresh Orders/i });
    await userEvent.click(refreshButton);

    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });
}); 