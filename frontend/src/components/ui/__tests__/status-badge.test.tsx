// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatusBadge } from '../status-badge';

describe('StatusBadge Component', () => {
  afterEach(cleanup);

  it('L-006: renders text and correct colour classes', () => {
    const { container, rerender } = render(<StatusBadge variant="success">COMPLETED</StatusBadge>);
    
    // It should render text
    expect(container).toHaveTextContent(/COMPLETED/i);
    expect(container.firstChild).toHaveClass('text-green-700');
    
    // Test different status
    rerender(<StatusBadge variant="danger">FAILED</StatusBadge>);
    expect(container).toHaveTextContent(/FAILED/i);
    expect(container.firstChild).toHaveClass('text-red-700');
  });
});
