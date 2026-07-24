// Should read the rules before creating/updating the test files
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import LandingPage from '../LandingPage';

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('LandingPage Unit Tests', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.clearAllMocks();
  });

  it('A-013: Render LandingPage — all three option items appear in the DOM', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Verify all 3 cards are rendered
    expect(screen.getByTestId('landing-card-workflows')).toBeInTheDocument();
    expect(screen.getByTestId('landing-card-executions')).toBeInTheDocument();
    expect(screen.getByTestId('landing-card-settings')).toBeInTheDocument();
  });

  it('A-014: Mock useNavigate — clicking a card calls navigate with the correct path', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const workflowsCard = screen.getByTestId('landing-card-workflows');
    fireEvent.click(workflowsCard);
    expect(mockNavigate).toHaveBeenCalledWith('/workflows');

    const executionsCard = screen.getByTestId('landing-card-executions');
    fireEvent.click(executionsCard);
    expect(mockNavigate).toHaveBeenCalledWith('/executions');
    
    const settingsCard = screen.getByTestId('landing-card-settings');
    fireEvent.click(settingsCard);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('A-015: Render with no router context — component throws an expected error boundary', async () => {
    // Unmock useNavigate for this specific test
    vi.mocked(useNavigate).mockImplementation(() => {
      throw new Error('useNavigate() may be used only in the context of a <Router> component.');
    });

    // We expect the render to throw. We can use try-catch or expect(() => ...).toThrow()
    // Suppress console.error for the expected error
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<LandingPage />);
    }).toThrow(/useNavigate/);

    consoleError.mockRestore();
  });
});
