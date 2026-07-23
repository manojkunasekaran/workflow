// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';



import { WaitDurationField } from '../WaitDurationField';
import { TaskRefField } from '../TaskRefField';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('Task Config Field Components', () => {
  describe('WaitDurationField (F-013, F-014)', () => {
    it('F-013: renders value and unit select', () => {
      render(
        <WaitDurationField
          id="wait"
          label="Wait"
          valueMs={30000}
          onChange={() => {}}
        />
      );
      // 30000 ms is 30 seconds
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByText('Seconds')).toBeInTheDocument();
    });

    it('F-014: changing unit dropdown fires onChange with new unit', async () => {
      const handleChange = vi.fn();
      render(
        <WaitDurationField
          id="wait"
          label="Wait"
          valueMs={30000} // 30 sec
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      
      const option = await screen.findByText('Minutes');
      fireEvent.click(option);

      expect(handleChange).toHaveBeenCalledWith(1800000);
    });
  });

  describe('TaskRefField (F-016, F-017)', () => {
    const mockTasks = [
      { taskId: 'task-1', type: 'HTTP_TASK' },
      { taskId: 'task-2', type: 'WAIT' }
    ];

    it('F-016: renders a dropdown of available task IDs from context', async () => {
      render(
        <TaskRefField
          id="test-ref"
          label="Select Task"
          value=""
          onChange={() => {}}
          candidates={mockTasks as any}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      
      expect(await screen.findByText(/HTTP Request/i)).toBeInTheDocument();
      expect(screen.getByText(/Wait/i)).toBeInTheDocument();
    });

    it('F-017: selecting a task ID fires onChange with that ID', async () => {
      const handleChange = vi.fn();
      render(
        <TaskRefField
          id="test-ref"
          label="Select Task"
          value=""
          onChange={handleChange}
          candidates={mockTasks as any}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      
      const option = await screen.findByText(/HTTP Request/i);
      fireEvent.click(option);

      expect(handleChange).toHaveBeenCalledWith('task-1');
    });
  });
});
