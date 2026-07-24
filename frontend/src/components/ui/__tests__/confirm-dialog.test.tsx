// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog Component', () => {
  it('L-012: ConfirmDialog — fires onConfirm callback and closes', async () => {
    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Are you sure?"
        description="This cannot be undone."
        onConfirm={mockOnConfirm}
        onOpenChange={mockOnCancel}
        open={true}
      />
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    
    // Find confirm button
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });
});
