import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Explore } from './Explore';
import userEvent from '@testing-library/user-event'

// Use shared auth mock via test-utils

describe('Explore Page', () => {
  it('renders the page with expected content', () => {
    render(<Explore />);

    expect(screen.getByText(/Explore Trending Ideas/i)).toBeInTheDocument();
    expect(screen.getByText(/Discover viral 3D model ideas/i)).toBeInTheDocument();
  });

  it('handles category selection', async () => {
    render(<Explore />);

    const categoryButton = screen.getByRole('button', { name: /Pets/i });
    await userEvent.click(categoryButton);

    expect(screen.getByText(/Pet Figurine/i)).toBeInTheDocument();
  });
}); 