// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton Component', () => {
  it('L-016: Skeleton — renders animated placeholder', () => {
    render(<Skeleton data-testid="test-skeleton" className="w-10 h-10" />);
    
    const skeleton = screen.getByTestId('test-skeleton');
    expect(skeleton).toBeInTheDocument();
    
    // Skeleton component applies the animate-pulse tailwind class
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('w-10', 'h-10');
  });
});
