import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Marketplace } from './Marketplace';
import userEvent from '@testing-library/user-event';

// Mock necessary services
vi.mock('../services/modelService', () => ({
  modelService: {
    fetchMarketplaceModels: vi.fn().mockResolvedValue([])
  }
}));

describe('Marketplace Page', () => {
  it('renders the page with expected content', () => {
    render(<Marketplace />);

    expect(screen.getByText(/3D Design Marketplace/i)).toBeInTheDocument();
    expect(screen.getByText(/Discover and purchase high-quality 3D models from talented creators/i)).toBeInTheDocument();
  });

  it('handles search input', async () => {
    render(<Marketplace />);

    const searchInput = screen.getByPlaceholderText(/Search designs.../i);
    await userEvent.type(searchInput, 'Flag');

    expect(screen.getByText('Flag')).toBeInTheDocument();
  });
}); 