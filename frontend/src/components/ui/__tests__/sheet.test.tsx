// Should read the rules before creating/updating the test files
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Sheet, SheetTrigger, SheetContent } from '../sheet';

beforeAll(() => {
  // Radix UI Dialog (used in Sheet) needs these for tests
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Sheet Component', () => {
  it('L-011: Sheet — slides in from the correct side when opened', async () => {
    render(
      <Sheet>
        <SheetTrigger data-testid="sheet-trigger">Open Sheet</SheetTrigger>
        <SheetContent side="right" data-testid="sheet-content">
          Sheet Content
        </SheetContent>
      </Sheet>
    );

    expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();

    const trigger = screen.getByTestId('sheet-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      const content = screen.getByTestId('sheet-content');
      expect(content).toBeInTheDocument();
      // Side 'right' translates to specific tailwind classes for sliding in from right
      expect(content.className).toMatch(/right-0/);
    });
  });
});
