import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { OrderSuccess } from './OrderSuccess';

// Use shared auth via test-utils

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

describe('OrderSuccess Page', () => {
  it('renders payment confirmation content', () => {
    render(<OrderSuccess />);

    expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
    expect(screen.getByText(/Your payment has been processed/i)).toBeInTheDocument();
  });

  it('shows order details section', () => {
    render(<OrderSuccess />);
    expect(screen.getByText(/Order ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer/i)).toBeInTheDocument();
  });
}); 