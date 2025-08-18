import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('calls onChange and updates value', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input label="Username" onChange={handleChange} />);
    const input = screen.getByDisplayValue('');

    await user.type(input, 'test');
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test');
  });

  it('shows error message', () => {
    render(<Input label="Username" error="Invalid username" />);
    expect(screen.getByText('Invalid username')).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    render(<Input label="Username" disabled />);
    const input = screen.getByDisplayValue('');
    expect(input).toBeDisabled();
  });
}); 