// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { ConditionalBranchListField } from '../ConditionalBranchListField';
import type { ConditionalBranchRow } from '@/features/workflow-studio/task-type-schema/conditionalBranch';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('ConditionalBranchListField (F-001 to F-005)', () => {
  const initialValue: ConditionalBranchRow[] = [
    {
      name: 'High priority',
      nextTaskId: '',
      conditionMode: 'rules',
      expression: '',
      rules: {
        operator: 'AND',
        conditions: [
          { field: 'priority', operator: 'EQUALS', value: 'high', negated: false }
        ]
      }
    }
  ];

  it('F-001: renders branches and rules successfully', () => {
    render(
      <ConditionalBranchListField
        fieldKey="branches"
        label="Branches"
        value={initialValue}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('High priority')).toBeInTheDocument();
    expect(screen.getByDisplayValue('priority')).toBeInTheDocument();
    expect(screen.getByDisplayValue('high')).toBeInTheDocument();
  });

  it('F-002: adding a rule to a branch appends to that branchs conditions', () => {
    const handleChange = vi.fn();
    render(
      <ConditionalBranchListField
        fieldKey="branches"
        label="Branches"
        value={initialValue}
        onChange={handleChange}
      />
    );

    const addConditionBtn = screen.getByRole('button', { name: /\+ Add condition/i });
    fireEvent.click(addConditionBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          rules: expect.objectContaining({
            conditions: [
              initialValue[0].rules.conditions[0],
              expect.objectContaining({ field: '', operator: 'EQUALS', value: '', negated: false })
            ]
          })
        })
      ])
    );
  });

  it('F-003: removing a rule re-indexes remaining rules', () => {
    const handleChange = vi.fn();
    const twoRulesValue: ConditionalBranchRow[] = [
      {
        ...initialValue[0],
        rules: {
          ...initialValue[0].rules,
          conditions: [
            initialValue[0].rules.conditions[0],
            { field: 'status', operator: 'EQUALS', value: 'open', negated: false }
          ]
        }
      }
    ];

    render(
      <ConditionalBranchListField
        fieldKey="branches"
        label="Branches"
        value={twoRulesValue}
        onChange={handleChange}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove condition/i });
    
    // Remove first condition
    fireEvent.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          rules: expect.objectContaining({
            conditions: [twoRulesValue[0].rules.conditions[1]]
          })
        })
      ])
    );
  });

  it('F-004: empty condition expression shows validation error', () => {
    render(
      <ConditionalBranchListField
        fieldKey="branches"
        label="Branches"
        value={[
          {
            name: 'Exp branch',
            nextTaskId: '',
            conditionMode: 'expression',
            expression: '',
            rules: { operator: 'AND', conditions: [] }
          }
        ]}
        onChange={() => {}}
        errors={{ 'branches.0.expression': 'Expression is required' }}
      />
    );

    expect(screen.getByText('Expression is required')).toBeInTheDocument();
  });

  it('F-005: AND / OR operator toggle changes rule combinator', async () => {
    const handleChange = vi.fn();
    render(
      <ConditionalBranchListField
        fieldKey="branches"
        label="Branches"
        value={initialValue}
        onChange={handleChange}
      />
    );

    const combobox = screen.getAllByRole('combobox').find(el => el.id === 'branches-0-operator');
    expect(combobox).toBeDefined();

    fireEvent.click(combobox!);
    fireEvent.keyDown(combobox!, { key: 'ArrowDown', code: 'ArrowDown' });

    const option = await screen.findByText('any condition (OR)');
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          rules: expect.objectContaining({
            operator: 'OR'
          })
        })
      ])
    );
  });
});
