// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import {
    waitPartsToMs,
    waitPartsToSeconds,
    msToWaitParts,
    secondsToWaitParts,
    formatWaitPreview,
    formatIntervalSecondsPreview,
} from '../waitDuration';
import { formatTaskOptionLabel, filterTaskPickCandidates, taskLabelById } from '../taskRefUtils';
import type { TaskValidationContext } from '@/features/workflow-studio/task-type-schema/types';

describe('Task Config Utils', () => {
  describe('waitDuration.ts (F-025 & F-026)', () => {
    it('F-025: msToWaitParts correctly parses milliseconds into amount and unit', () => {
      // 90 seconds
      expect(msToWaitParts(90000)).toEqual({ amount: 90, unit: 'seconds' });
      // 2 minutes
      expect(msToWaitParts(120000)).toEqual({ amount: 2, unit: 'minutes' });
      // 3 hours
      expect(msToWaitParts(10800000)).toEqual({ amount: 3, unit: 'hours' });
    });

    it('F-026: formatWaitPreview correctly formats ms', () => {
      expect(formatWaitPreview(120000)).toBe('2 min');
      expect(formatWaitPreview(3600000)).toBe('1 hr');
      expect(formatWaitPreview(45000)).toBe('45 sec');
      expect(formatWaitPreview(0)).toBe('—');
      expect(formatWaitPreview(undefined)).toBe('—');
    });

    it('waitPartsToMs converts back to ms', () => {
      expect(waitPartsToMs(90, 'seconds')).toBe(90000);
      expect(waitPartsToMs(2, 'minutes')).toBe(120000);
    });

    it('supports days unit for interval conversion', () => {
      expect(waitPartsToMs(2, 'days')).toBe(172800000);
      expect(waitPartsToSeconds(2, 'days')).toBe(172800);
      expect(msToWaitParts(172800000)).toEqual({ amount: 2, unit: 'days' });
      expect(secondsToWaitParts(172800)).toEqual({ amount: 2, unit: 'days' });
      expect(formatIntervalSecondsPreview(3600)).toBe('Approximately every 1 hr');
      expect(formatWaitPreview(172800000)).toBe('2 days');
    });
  });

  describe('taskRefUtils.ts (F-027)', () => {
    const mockTasks: TaskValidationContext['workflowTasks'] = [
      { taskId: 't1', type: 'HTTP_TASK', displayName: 'Fetch Data', parameters: {} },
      { taskId: 't2', type: 'WAIT', parameters: {} },
      { taskId: 'loop-body-t1', type: 'HTTP_TASK', parameters: {} },
    ];

    it('formatTaskOptionLabel resolves display name or type fallback', () => {
      expect(formatTaskOptionLabel(mockTasks[0])).toBe('Fetch Data');
      expect(formatTaskOptionLabel(mockTasks[1])).toBe('Wait');
    });

    it('F-027: getAvailableTaskRefs (filterTaskPickCandidates) filters tasks correctly', () => {
      // filter out t1
      const filtered1 = filterTaskPickCandidates(mockTasks, { excludeTaskIds: ['t1'] });
      expect(filtered1.length).toBe(2);
      expect(filtered1.map(t => t.taskId)).not.toContain('t1');

      // filter by type
      const filtered2 = filterTaskPickCandidates(mockTasks, { filterTypes: ['WAIT'] });
      expect(filtered2.length).toBe(1);
      expect(filtered2[0].taskId).toBe('t2');
    });

    it('taskLabelById finds and formats label', () => {
      expect(taskLabelById(mockTasks, 't1')).toBe('Fetch Data');
      expect(taskLabelById(mockTasks, 't2')).toBe('Wait');
      expect(taskLabelById(mockTasks, 'unknown')).toBe('Unknown step');
    });
  });
});
