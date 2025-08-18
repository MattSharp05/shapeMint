import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { GenerationProgress } from './GenerationProgress';

describe('GenerationProgress Component', () => {
  it('renders initial state correctly', () => {
    render(<GenerationProgress progress={0} status="pending" />);
    
    expect(screen.getByText(/initializing generation/i)).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<GenerationProgress progress={50} status="generating" />);
    
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('shows progress bar when generating', () => {
    render(<GenerationProgress progress={75} status="generating" />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/generating your 3d model/i)).toBeInTheDocument();
  });

  it('shows completion state', () => {
    render(<GenerationProgress progress={100} status="completed" />);
    
    expect(screen.getByText(/generation completed/i)).toBeInTheDocument();
    expect(screen.getByText('100% complete')).toBeInTheDocument();
  });

  it('shows failure state', () => {
    render(<GenerationProgress progress={0} status="failed" />);
    
    expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
  });

  it('displays estimated time when provided', () => {
    render(
      <GenerationProgress 
        progress={50} 
        status="generating" 
        estimatedTime="2 minutes"
      />
    );
    
    expect(screen.getByText(/estimated time: 2 minutes/i)).toBeInTheDocument();
  });

  it('does not show progress bar when not generating', () => {
    render(<GenerationProgress progress={50} status="completed" />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('handles edge cases gracefully', () => {
    render(<GenerationProgress progress={-10} status="generating" />);
    
    expect(screen.getByText('-10% complete')).toBeInTheDocument();
  });

  it('handles high progress values', () => {
    render(<GenerationProgress progress={150} status="generating" />);
    
    expect(screen.getByText('150% complete')).toBeInTheDocument();
  });
}); 