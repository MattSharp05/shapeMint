import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { UserProfile } from './UserProfile';

// Use shared auth via test-utils

describe('UserProfile Page', () => {
  it('renders basic content', () => {
    render(<UserProfile />);

    expect(screen.getByText(/User Not Found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Marketplace/i })).toBeInTheDocument();
  });

  it('displays default static profile info', () => {
    render(<UserProfile />);
    expect(screen.getByText(/Alex Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Passionate 3D designer/i)).toBeInTheDocument();
  });
}); 