// Should read the rules before creating/updating the test files
import { describe, it, expect, vi } from 'vitest';
import { loadExecutionGraph } from '../loadExecutionGraph';
import { executionApi } from '@/api/executionApi';
import { workflowApi } from '@/api/workflowApi';

vi.mock('@/api/executionApi', () => ({
  executionApi: {
    getById: vi.fn(),
    getTaskExecutions: vi.fn(),
  }
}));

vi.mock('@/api/workflowApi', () => ({
  workflowApi: {
    getById: vi.fn(),
  }
}));

// Partially mock definitionToFlow
vi.mock('@/features/workflow-studio/lib/workflowGraph', () => ({
  definitionToFlow: vi.fn(() => ({
    nodes: [{ id: 'node-1', data: {} }],
    edges: [{ id: 'edge-1' }]
  }))
}));

describe('loadExecutionGraph (H-039)', () => {
  it('H-039: loadExecutionGraph loads data and returns frozen nodes', async () => {
    vi.mocked(executionApi.getById).mockResolvedValue({ workflowId: 'wf-1' } as any);
    vi.mocked(executionApi.getTaskExecutions).mockResolvedValue([{ status: 'COMPLETED' } as any]);
    vi.mocked(workflowApi.getById).mockResolvedValue({ id: 'wf-1' } as any);

    const result = await loadExecutionGraph('exec-1');

    expect(result.execution.workflowId).toBe('wf-1');
    expect(result.taskExecutions[0].status).toBe('COMPLETED');
    expect(result.nodes[0].draggable).toBe(false);
  });
});
