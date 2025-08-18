import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { AutoThumbnailProgress } from './AutoThumbnailProgress';

describe('AutoThumbnailProgress Component', () => {
  const defaultProgress = {
    total: 10,
    processed: 0,
    current: null,
    isGenerating: false,
    error: null
  };

  it('renders initial state correctly', () => {
    render(<AutoThumbnailProgress progress={defaultProgress} />);

    expect(screen.getByText(/0 of 10 completed/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('updates progress bar correctly', () => {
    const progress = {
      ...defaultProgress,
      processed: 5,
      isGenerating: true
    };

    render(<AutoThumbnailProgress progress={progress} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/5 of 10 completed/)).toBeInTheDocument();
  });

  it('shows error state', () => {
    const progress = {
      ...defaultProgress,
      error: 'Failed to generate thumbnails'
    };

    render(<AutoThumbnailProgress progress={progress} />);

    expect(screen.getByText(/failed to generate thumbnails/i)).toBeInTheDocument();
  });

  it('shows current model being processed', () => {
    const progress = {
      ...defaultProgress,
      current: 'model-123.glb',
      isGenerating: true
    };

    render(<AutoThumbnailProgress progress={progress} />);

    expect(screen.getByText(/processing: model-123\.glb/i)).toBeInTheDocument();
  });

  it('shows completion message', () => {
    const progress = {
      ...defaultProgress,
      processed: 10,
      isGenerating: false
    };

    render(<AutoThumbnailProgress progress={progress} />);

    expect(screen.getByText(/successfully generated 10 thumbnail/i)).toBeInTheDocument();
  });

  it('calls onStop when stop button is clicked', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const progress = {
      ...defaultProgress,
      isGenerating: true
    };

    render(<AutoThumbnailProgress progress={progress} onStop={onStop} />);

    const stopButton = screen.getByTitle('Stop generation');
    await user.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const progress = {
      ...defaultProgress,
      error: 'Generation failed'
    };

    render(<AutoThumbnailProgress progress={progress} onRetry={onRetry} />);

    const retryButton = screen.getByText(/retry generation/i);
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('toggles minimize state', async () => {
    const user = userEvent.setup();
    render(<AutoThumbnailProgress progress={defaultProgress} />);

    const minimizeButton = screen.getByTitle('Minimize');
    await user.click(minimizeButton);

    expect(screen.getByTitle('Expand')).toBeInTheDocument();
  });

  it('does not render when no progress and no error', () => {
    const emptyProgress = {
      total: 0,
      processed: 0,
      current: null,
      isGenerating: false,
      error: null
    };

    const { container } = render(<AutoThumbnailProgress progress={emptyProgress} />);
    expect(container.firstChild).toBeNull();
  });
}); 