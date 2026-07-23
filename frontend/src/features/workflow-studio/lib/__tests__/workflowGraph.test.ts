// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import {
  definitionToFlow,
  flowToDefinition,
  createStartNode,
  createAddTaskNode,
  appendTaskToChain,
  removeTaskFromChain,
} from '../workflowGraph';

describe('Workflow Graph Utilities', () => {
  describe('Happy Path — Graph Transformations', () => {
    it('E-001: definitionToFlow transforms workflow definition into React Flow nodes and edges', () => {
      const def = {
        id: 'wf-1',
        name: 'Test Workflow',
        tasks: [
          { taskId: 'task-1', type: 'HTTP_TASK', parameters: { url: 'https://example.com' } },
          { taskId: 'task-2', type: 'WAIT', parameters: { duration: 10 } },
        ],
      };
      
      const res = definitionToFlow(def as any);

      expect(res.nodes.length).toBeGreaterThanOrEqual(3); // Start, task-1, task-2, AddTask
      expect(res.nodes.some((n: any) => n.id === '__workflow_start__')).toBe(true);
      expect(res.nodes.some((n: any) => n.id === 'task-1')).toBe(true);
      expect(res.edges.length).toBeGreaterThan(0);
    });

    it('E-002: flowToDefinition serializes React Flow canvas nodes back into WorkflowDefinition', () => {
      const initialDef = {
        id: 'wf-1',
        name: 'Export Test',
        tasks: [{ taskId: 't1', type: 'HTTP_TASK', parameters: { url: 'https://api.com' } }],
      };
      
      const { nodes, edges } = definitionToFlow(initialDef as any);
      const def = flowToDefinition('Export Test', nodes, edges, initialDef as any, 'wf-1');

      expect(def.name).toBe('Export Test');
      expect(def.tasks).toHaveLength(1);
      expect(def.tasks[0].taskId).toBe('t1');
    });

    it('E-003: createStartNode & createAddTaskNode return structural canvas nodes', () => {
      const nodes = {
        start: createStartNode({ x: 0, y: 0 }),
        add: createAddTaskNode({ x: 100, y: 0 }),
      };

      expect(nodes.start.id).toBe('__workflow_start__');
      expect(nodes.start.type).toBe('start');
      expect(nodes.add.id).toBe('__add_task__');
      expect(nodes.add.type).toBe('addTask');
    });
  });

  describe('Happy Path — Canvas Modifications', () => {
    it('E-004: appendTaskToChain appends new task node and updates chain edges', () => {
      const initial = definitionToFlow({
        id: 'wf-1',
        name: 'Chain Test',
        tasks: [{ taskId: 't1', type: 'HTTP_TASK', parameters: { url: 'https://a.com' } }],
      } as any);

      const res = appendTaskToChain(initial.nodes, initial.edges, {
        taskId: 't2',
        type: 'WAIT',
        parameters: { duration: 5 },
      } as any);

      expect(res).not.toBeNull();
      expect(res.nodes.some((n: any) => n.id === 't2')).toBe(true);
    });

    it('E-005: removeTaskFromChain removes task node and rewires remaining chain', () => {
      const initial = definitionToFlow({
        id: 'wf-1',
        name: 'Remove Test',
        tasks: [
          { taskId: 't1', type: 'HTTP_TASK', parameters: {} },
          { taskId: 't2', type: 'WAIT', parameters: {} },
        ],
      } as any);

      const res = removeTaskFromChain(initial.nodes, initial.edges, 't1');

      expect(res.nodes.some((n: any) => n.id === 't1')).toBe(false);
      expect(res.nodes.some((n: any) => n.id === 't2')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('E-006: definitionToFlow handles empty task list gracefully', () => {
      const res = definitionToFlow({ id: 'empty-wf', name: 'Empty', tasks: [] } as any);

      expect(res.nodes.length).toBeGreaterThanOrEqual(2); // Start + AddTask
      expect(res.edges.length).toBeGreaterThanOrEqual(1); // Start -> AddTask
    });
  });
});
