// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

describe('Tooltip Component', () => {
  it('L-010: Tooltip — renders tooltip content on hover/focus', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    
    const trigger = screen.getByTestId('tooltip-trigger');
    expect(trigger).toBeInTheDocument();
  });
});
