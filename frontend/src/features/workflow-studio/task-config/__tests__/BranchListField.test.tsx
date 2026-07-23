// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BranchListField } from '../BranchListField';

describe('BranchListField (F-010 to F-012)', () => {
  const initialValue = [
    { branchName: 'US region', startTaskId: 'task-1' }
  ];

  it('F-010: renders configured branch paths', () => {
    render(
      <BranchListField
        fieldKey="branches"
        label="Branches"
        value={initialValue}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('US region')).toBeInTheDocument();
  });

  it('F-011: adding a branch appends a new entry', () => {
    const handleChange = vi.fn();
    render(
      <BranchListField
        fieldKey="branches"
        label="Branches"
        value={initialValue}
        onChange={handleChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add branch/i });
    fireEvent.click(addButton);

    expect(handleChange).toHaveBeenCalledWith([
      ...initialValue,
      { branchName: 'Branch 2', startTaskId: '' }
    ]);
  });

  it('F-012: removing a branch updates entries', () => {
    const handleChange = vi.fn();
    const twoBranches = [
      ...initialValue,
      { branchName: 'EU region', startTaskId: 'task-2' }
    ];

    render(
      <BranchListField
        fieldKey="branches"
        label="Branches"
        value={twoBranches}
        onChange={handleChange}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove branch/i });
    expect(removeButtons).toHaveLength(2);
    
    // Remove the first branch
    fireEvent.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith([twoBranches[1]]);
  });
});
