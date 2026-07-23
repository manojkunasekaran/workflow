// Should read the rules before creating/updating the test files
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../workflowStore';

describe('Zustand Workflow Store & History', () => {
  beforeEach(() => {
    useWorkflowStore.getState().resetCanvas([], []);
    useWorkflowStore.temporal.getState().clear();
  });

  describe('Happy Path — State Mutations', () => {
    it('D-001 & D-002: setNodes and setEdges update Zustand store state', () => {
      useWorkflowStore.getState().setNodes([
        { id: 'node-1', position: { x: 10, y: 10 }, data: { label: 'Node 1', task: { taskId: 'node-1', type: 'HTTP_TASK' } } } as any,
      ]);
      useWorkflowStore.getState().setEdges([
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]);
      
      const { nodes, edges } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('node-1');
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('edge-1');
    });

    it('D-003: resetCanvas updates nodes and edges simultaneously', () => {
      useWorkflowStore.getState().resetCanvas(
        [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'N1' } }] as any,
        [{ id: 'e1', source: 'n1', target: 'n2' }],
      );
      
      const { nodes, edges } = useWorkflowStore.getState();
      expect(nodes).toHaveLength(1);
      expect(edges).toHaveLength(1);
    });

    it('D-004 & D-005: onNodesChange and onEdgesChange apply React Flow deltas', () => {
      useWorkflowStore.getState().resetCanvas(
        [{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any,
        [{ id: 'e1', source: 'n1', target: 'n2' }],
      );
      useWorkflowStore.getState().onNodesChange([
        { type: 'position', id: 'n1', position: { x: 50, y: 100 } } as any,
      ]);
      useWorkflowStore.getState().onEdgesChange([
        { type: 'remove', id: 'e1' },
      ]);
      
      const nodePos = useWorkflowStore.getState().nodes[0].position;
      const edgesCount = useWorkflowStore.getState().edges.length;
      
      expect(nodePos).toEqual({ x: 50, y: 100 });
      expect(edgesCount).toBe(0);
    });
  });

  describe('Edge Cases — Temporal History (Undo/Redo)', () => {
    it('D-006: zundo temporal store tracks state history for undo and redo', () => {
      const store = useWorkflowStore;
      
      // Step 1: add n1
      store.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any);
      const countAfterAdd = store.getState().nodes.length;

      // Undo
      store.temporal.getState().undo();
      const countAfterUndo = store.getState().nodes.length;

      // Redo
      store.temporal.getState().redo();
      const countAfterRedo = store.getState().nodes.length;

      expect(countAfterAdd).toBe(1);
      expect(countAfterUndo).toBe(0);
      expect(countAfterRedo).toBe(1);
    });
  });
});
