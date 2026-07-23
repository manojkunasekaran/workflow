// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionStatusBadge } from '../ExecutionStatusBadge';
import '@testing-library/jest-dom';

describe('ExecutionStatusBadge (H-043 to H-046)', () => {
  it('H-043: renders correct colour (success) for COMPLETED status', () => {
    render(<ExecutionStatusBadge status="COMPLETED" />);
    const badge = screen.getByTestId('execution-status-badge');
    expect(badge).toHaveTextContent('Done');
    // Using string matching for class names since variant="success" adds specific tailwind classes
    // that depends on StatusBadge implementation, we just ensure it renders
    expect(badge.className).toContain('bg-emerald'); // typical success class
  });

  it('H-044: renders correct colour (danger) for FAILED status', () => {
    render(<ExecutionStatusBadge status="FAILED" />);
    const badge = screen.getByTestId('execution-status-badge');
    expect(badge).toHaveTextContent('Failed');
    expect(badge.className).toContain('bg-destructive');
  });

  it('H-045: renders correct colour (warning) for RUNNING status and shows spinner', () => {
    const { container } = render(<ExecutionStatusBadge status="RUNNING" />);
    const badge = screen.getByTestId('execution-status-badge');
    expect(badge).toHaveTextContent('Running');
    // Running shows warning variant which usually maps to amber/yellow
    expect(badge.className).toContain('bg-amber');
    
    // Check for spinner (lucide-react Loader2 renders svg with animate-spin class)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('H-046: unknown status renders neutral badge', () => {
    render(<ExecutionStatusBadge status="UNKNOWN" />);
    const badge = screen.getByTestId('execution-status-badge');
    expect(badge).toHaveTextContent('UNKNOWN');
    expect(badge.className).toContain('bg-secondary'); // typical neutral class
  });
});
