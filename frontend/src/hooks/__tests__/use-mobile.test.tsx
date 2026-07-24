// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile Hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('L-007: returns true when window.innerWidth < 768', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    // Also might use matchMedia. Let's just mock matchMedia as well in case it uses it
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)' || query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('L-008: updates state on window resize event', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    let changeCallback: EventListener | null = null;
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn().mockImplementation((event, cb) => {
        if (event === 'change') {
          changeCallback = cb as EventListener;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Change window size and trigger media query change event
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      if (changeCallback) {
        changeCallback(new Event('change'));
      }
    });

    expect(result.current).toBe(true);
  });
});
