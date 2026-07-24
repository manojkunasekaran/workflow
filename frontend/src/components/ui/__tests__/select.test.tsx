// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select';

describe('Select Component', () => {
  afterEach(cleanup);

  it('L-005: displays options and calls onValueChange', async () => {
    // Mock scrollIntoView and hasPointerCapture for Radix UI
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);

    const handleValueChange = vi.fn();
    
    render(
      <Select onValueChange={handleValueChange}>
        <SelectTrigger aria-label="Choose fruit">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Open the select
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    
    // Wait for the portal content to show
    const option = await screen.findByText('Banana');
    expect(option).toBeInTheDocument();
    
    // Click option
    fireEvent.click(option);
    
    // Check if handler was called
    expect(handleValueChange).toHaveBeenCalledWith('banana');
  });
});
