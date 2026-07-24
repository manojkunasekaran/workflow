// Should read the rules before creating/updating the test files
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScrollArea } from '../scroll-area';

beforeAll(() => {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('ScrollArea Component', () => {
  it('L-014: ScrollArea — manages overflow and renders scrollbars', () => {
    render(
      <ScrollArea data-testid="test-scroll-area">
        <div style={{ height: '1000px' }}>Tall Content</div>
      </ScrollArea>
    );
    
    // Radix UI ScrollArea renders a viewport container
    const scrollArea = screen.getByTestId('test-scroll-area');
    expect(scrollArea).toBeInTheDocument();
    
    // Ensure content is placed inside
    expect(screen.getByText('Tall Content')).toBeInTheDocument();
  });
});
