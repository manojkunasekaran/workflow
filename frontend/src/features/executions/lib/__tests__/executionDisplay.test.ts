// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { formatExecutionDuration } from '../executionDisplay';

describe('executionDisplay (H-036, H-037)', () => {
  it('H-036: formatExecutionDuration returns human-readable string', () => {
    const start = new Date('2024-01-01T12:00:00.000Z');
    const end = new Date('2024-01-01T12:00:05.000Z'); // 5000ms
    expect(formatExecutionDuration(start.toISOString(), end.toISOString())).toBe('5s');
  });

  it('H-037: formatExecutionDuration returns < 1ms or equivalent for 0 duration', () => {
    const start = new Date('2024-01-01T12:00:00.000Z');
    expect(formatExecutionDuration(start.toISOString(), start.toISOString())).toBe('< 1ms');
  });
});
