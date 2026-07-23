// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HumanActionListField } from '../HumanActionListField';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('HumanActionListField (F-006 to F-009)', () => {
  const initialValue = [
    { id: 'approve', label: 'Approve', outcome: 'APPROVED', nextTaskId: '' }
  ];

  it('F-006: renders existing action list', () => {
    render(
      <HumanActionListField
        fieldKey="actions"
        label="Actions"
        value={initialValue}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('approve')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Approve')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument(); // Select trigger
  });

  it('F-007: adding action appends entry with default label', () => {
    const handleChange = vi.fn();
    render(
      <HumanActionListField
        fieldKey="actions"
        label="Actions"
        value={initialValue}
        onChange={handleChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add action/i });
    fireEvent.click(addButton);

    expect(handleChange).toHaveBeenCalledWith([
      ...initialValue,
      { id: 'action_2', label: 'New action', outcome: 'APPROVED', nextTaskId: '' }
    ]);
  });

  it('F-008: removing an action updates list correctly', () => {
    const handleChange = vi.fn();
    const twoActions = [
      ...initialValue,
      { id: 'reject', label: 'Reject', outcome: 'REJECTED', nextTaskId: '' }
    ];

    render(
      <HumanActionListField
        fieldKey="actions"
        label="Actions"
        value={twoActions}
        onChange={handleChange}
      />
    );

    // Remove the first action (Action 1)
    const removeButtons = screen.getAllByRole('button', { name: /Remove action/i });
    expect(removeButtons).toHaveLength(2);
    
    fireEvent.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith([twoActions[1]]);
  });

  it('F-009: empty action label triggers inline validation', () => {
    // Pass errors prop
    render(
      <HumanActionListField
        fieldKey="actions"
        label="Actions"
        value={initialValue}
        onChange={() => {}}
        errors={{ 'actions.0.label': 'Label is required' }}
      />
    );

    expect(screen.getByText('Label is required')).toBeInTheDocument();
  });
});
