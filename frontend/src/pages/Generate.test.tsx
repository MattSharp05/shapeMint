import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Generate } from './Generate';

// Mock necessary hooks and services
vi.mock('../hooks/useThumbnailGenerator', () => ({
  useThumbnailGenerator: () => ({
    isGenerating: false,
    generateThumbnails: vi.fn()
  })
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('Generate Page', () => {
  it('renders the page with expected content', () => {
    render(<Generate />);

    expect(screen.getByText(/Generate Your 3D Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Transform your ideas into 3D reality with AI-powered generation in under 60 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/Describe your 3D model/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate 3D Model/i })).toBeInTheDocument();
    
  });
}); 