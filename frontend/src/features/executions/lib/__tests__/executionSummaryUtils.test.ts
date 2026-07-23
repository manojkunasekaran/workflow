// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { getFailedStepId } from '../executionSummaryUtils';

describe('executionSummaryUtils (H-034, H-035)', () => {
  it('H-034: getFailedStepId returns first FAILED task ID', () => {
    const executions = [
      { status: 'COMPLETED', taskDefinitionId: 'task-1' },
      { status: 'FAILED', taskDefinitionId: 'task-2' },
      { status: 'FAILED', taskDefinitionId: 'task-3' },
    ];
    expect(getFailedStepId(executions)).toBe('task-2');
  });

  it('H-035: getFailedStepId returns null for COMPLETED run', () => {
    const executions = [
      { status: 'COMPLETED', taskDefinitionId: 'task-1' },
      { status: 'COMPLETED', taskDefinitionId: 'task-2' },
    ];
    expect(getFailedStepId(executions)).toBeNull();
  });
});
