// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { buildExecutionNodeStatusMap, executionNodeBorderClass } from '../executionNodeStatus';
import type { WorkflowTaskExecution } from '@/api/executionApi';

describe('executionNodeStatus (H-028 to H-033)', () => {
  describe('executionNodeBorderClass', () => {
    it('H-028: COMPLETED maps to completed visual state', () => {
      expect(executionNodeBorderClass('COMPLETED')).toBe('border-green-500');
    });

    it('H-029: FAILED maps to failed visual state', () => {
      expect(executionNodeBorderClass('FAILED')).toBe('border-destructive');
    });

    it('H-030: RUNNING maps to running visual state', () => {
      expect(executionNodeBorderClass('RUNNING')).toBe('border-amber-400');
    });

    it('H-031: QUEUED or PENDING maps to pending visual state (undefined border)', () => {
      // Assuming QUEUED maps to undefined/idle border
      expect(executionNodeBorderClass('QUEUED')).toBeUndefined();
      expect(executionNodeBorderClass('PENDING')).toBeUndefined();
    });

    it('H-032: PAUSED maps to paused visual state', () => {
      expect(executionNodeBorderClass('PAUSED')).toBe('border-sky-400');
    });

    it('H-033: unknown status string maps to idle (undefined border)', () => {
      expect(executionNodeBorderClass('UNKNOWN_STATUS')).toBeUndefined();
    });
  });

  describe('buildExecutionNodeStatusMap', () => {
    it('maps given executions and defaults others to PENDING', () => {
      const executions: WorkflowTaskExecution[] = [
        { taskDefinitionId: 'task-1', status: 'COMPLETED' } as any
      ];
      const taskIds = ['task-1', 'task-2'];
      const map = buildExecutionNodeStatusMap(executions, taskIds);

      expect(map.get('task-1')?.status).toBe('COMPLETED');
      expect(map.get('task-2')?.status).toBe('PENDING');
    });
  });
});
