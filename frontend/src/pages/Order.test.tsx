import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Order } from './Order';
import userEvent from '@testing-library/user-event'

// Use shared auth via test-utils

vi.mock('../supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('Order Page', () => {
  it('renders the page with expected sections', () => {
    render(<Order />);

    expect(screen.getByLabelText(/Order Your 3D Print/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Material & Options/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
    expect(screen.getByText(/STL File Ready: Auto-populated from generation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('handles place order action', async () => {
    render(<Order />);

    const nextButton = screen.getByRole('button', { name: /Next/i });
    await userEvent.click(nextButton);

    // expect(screen.getByText(/Order created successfully/i)).toBeInTheDocument();
  });
}); 