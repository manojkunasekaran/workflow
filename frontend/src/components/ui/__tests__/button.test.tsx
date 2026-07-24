// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Button } from '../button';

describe('Button Component', () => {
  afterEach(cleanup);

  it('L-001: renders with correct variant classes', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByText('Default')).toHaveClass('bg-primary');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
  });

  it('L-002: renders loading spinner when isLoading=true', () => {
    const { container } = render(<Button isLoading>Loading Button</Button>);
    // check if it has the svg class 'animate-spin' and the button has pointer-events-none and opacity-50
    const btn = container.firstChild as HTMLElement;
    expect(btn.hasAttribute('disabled')).toBe(true);
    // Find the Loader2 icon inside which has lucide-loader-2 and animate-spin
    const svg = btn.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('animate-spin')).toBe(true);
  });
});
