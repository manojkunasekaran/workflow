// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { canRespondToHumanTask } from '../humanTaskExecution';
import type { WorkflowTaskExecution } from '@/api/executionApi';

describe('humanTaskExecution (H-038)', () => {
  it('H-038: canRespondToHumanTask returns true for HUMAN_TASK type in PAUSED status', () => {
    const exec: WorkflowTaskExecution = {
      taskType: 'HUMAN_TASK',
      status: 'PAUSED'
    } as any;
    expect(canRespondToHumanTask(exec)).toBe(true);
  });

  it('H-038: canRespondToHumanTask returns false for HUMAN_TASK if status is COMPLETED', () => {
    const exec: WorkflowTaskExecution = {
      taskType: 'HUMAN_TASK',
      status: 'COMPLETED'
    } as any;
    expect(canRespondToHumanTask(exec)).toBe(false);
  });
});
