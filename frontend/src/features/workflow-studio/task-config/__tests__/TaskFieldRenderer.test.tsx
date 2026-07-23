// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TaskFieldRenderer } from '../TaskFieldRenderer';
import { TaskParametersForm } from '../TaskParametersForm';
import type { TaskTypePlugin } from '@/features/workflow-studio/task-type-schema/pluginTypes';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('TaskFieldRenderer (F-019 to F-023)', () => {
  it('F-020: string field renders text input', () => {
    render(
      <TaskFieldRenderer
        field={{ key: 'url', type: 'string', label: 'URL' }}
        parameters={{ url: 'https://example.com' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('F-021: enum field renders select dropdown', () => {
    render(
      <TaskFieldRenderer
        field={{ key: 'method', type: 'select', label: 'Method', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }] }}
        parameters={{ method: 'GET' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('F-022: segmented field renders toggle buttons', () => {
    render(
      <TaskFieldRenderer
        field={{ key: 'force', type: 'segmented', label: 'Force', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }}
        parameters={{ force: 'true' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('group', { name: 'Force' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
  });

  it('F-023: unknown field type renders fallback input or nothing', () => {
    // If it's totally unknown, it might render a standard string input fallback.
    const { container } = render(
      <TaskFieldRenderer
        field={{ key: 'unknown_prop', type: 'unknown_type' as any, label: 'Unknown Prop' }}
        parameters={{ unknown_prop: 'val' }}
        onChange={() => {}}
      />
    );
    // As long as it doesn't crash and renders the label at least
    expect(screen.getByText('Unknown Prop')).toBeInTheDocument();
  });

  it('F-019: renders correct input type per schema field definition', () => {
    // Already covered mostly by above, we verify change handlers fire
    const handleChange = vi.fn();
    render(
      <TaskFieldRenderer
        field={{ key: 'url', type: 'string', label: 'URL' }}
        parameters={{ url: 'https://example.com' }}
        onChange={handleChange}
      />
    );
    const input = screen.getByDisplayValue('https://example.com');
    fireEvent.change(input, { target: { value: 'http://test.com' } });
    expect(handleChange).toHaveBeenCalledWith({ url: 'http://test.com' });
  });
});

describe('TaskParametersForm (F-024)', () => {
  it('F-024: renders all fields defined in plugin schema', () => {
    const mockPlugin: TaskTypePlugin = {
      type: 'MOCK',
      label: 'Mock Plugin',
      defaultTaskId: 'mock',
      fields: [
        { key: 'url', type: 'string', label: 'URL' },
        { key: 'method', type: 'select', label: 'Method', options: [{ value: 'GET', label: 'GET' }] },
        { key: 'force', type: 'segmented', label: 'Force', options: [{ value: 'true', label: 'Yes' }] }
      ]
    } as any;

    render(
      <TaskParametersForm
        plugin={mockPlugin}
        parameters={{ url: 'http', method: 'GET', force: false }}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Force')).toBeInTheDocument();
  });
});
