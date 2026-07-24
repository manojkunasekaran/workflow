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

    it('D-009: temporal.clear() — empties past and future stacks', () => {
      const store = useWorkflowStore;
      store.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any);
      
      expect(store.temporal.getState().pastStates.length).toBeGreaterThan(0);
      
      store.temporal.getState().clear();
      
      expect(store.temporal.getState().pastStates).toHaveLength(0);
      expect(store.temporal.getState().futureStates).toHaveLength(0);
    });

    it('D-010: Multiple undo calls stop at the oldest state (stack floor)', () => {
      const store = useWorkflowStore;
      store.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any);
      store.getState().setNodes([{ id: 'n2', position: { x: 0, y: 0 }, data: {} }] as any);
      
      // Call undo more times than there are states
      store.temporal.getState().undo();
      store.temporal.getState().undo();
      store.temporal.getState().undo();
      store.temporal.getState().undo();
      
      // State should not crash and should be at the initial empty state
      expect(store.getState().nodes).toHaveLength(0);
    });

    it('D-011: Redo with empty future stack — state unchanged, no error thrown', () => {
      const store = useWorkflowStore;
      store.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any);
      
      store.temporal.getState().redo(); // Nothing to redo
      
      expect(store.getState().nodes).toHaveLength(1);
      expect(store.getState().nodes[0].id).toBe('n1');
    });

    it('D-012: resetCanvas then temporal.clear() — history stack is empty', () => {
      const store = useWorkflowStore;
      store.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }] as any);
      
      store.getState().resetCanvas([], []);
      store.temporal.getState().clear();
      
      expect(store.temporal.getState().pastStates).toHaveLength(0);
      expect(store.temporal.getState().futureStates).toHaveLength(0);
      expect(store.getState().nodes).toHaveLength(0);
    });

    it('D-013: 51 consecutive state changes — history capped at 50 (zundo limit)', () => {
      const store = useWorkflowStore;
      // Perform 51 updates
      for (let i = 0; i < 51; i++) {
        store.getState().setNodes([{ id: `n${i}`, position: { x: 0, y: 0 }, data: {} }] as any);
      }
      
      const pastCount = store.temporal.getState().pastStates.length;
      expect(pastCount).toBeLessThanOrEqual(50);
    });
  });
});
