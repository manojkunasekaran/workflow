// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from '../separator';

describe('Separator Component', () => {
  it('L-018: Separator — renders horizontal or vertical visual dividers', () => {
    const { rerender } = render(
      <Separator data-testid="test-separator" orientation="horizontal" />
    );
    
    let separator = screen.getByTestId('test-separator');
    expect(separator).toBeInTheDocument();
    
    // Radix separator applies orientation attributes
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    // Horizontal class check (e.g. h-[1px] w-full)
    expect(separator.className).toContain('w-full');

    rerender(<Separator data-testid="test-separator" orientation="vertical" />);
    separator = screen.getByTestId('test-separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    // Vertical class check (e.g. w-[1px] h-full)
    expect(separator.className).toContain('h-full');
  });
});
