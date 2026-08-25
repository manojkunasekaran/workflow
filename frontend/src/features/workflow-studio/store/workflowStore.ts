import { create } from 'zustand';
import { temporal } from 'zundo';
import { applyNodeChanges, applyEdgeChanges, type Edge, type NodeChange, type EdgeChange } from '@xyflow/react';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/workflowGraph';

export interface WorkflowState {
    nodes: StudioCanvasNode[];
    edges: Edge[];
    setNodes: (nodes: StudioCanvasNode[] | ((prev: StudioCanvasNode[]) => StudioCanvasNode[])) => void;
    setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
    onNodesChange: (changes: NodeChange<StudioCanvasNode>[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    resetCanvas: (nodes: StudioCanvasNode[], edges: Edge[]) => void;
    updateTaskSampleData: (taskId: string, data: Record<string, unknown>) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
    temporal(
        (set) => ({
            nodes: [],
            edges: [],
            setNodes: (nodesOrUpdater) => {
                set((state) => ({
                    nodes:
                        typeof nodesOrUpdater === 'function'
                            ? nodesOrUpdater(state.nodes)
                            : nodesOrUpdater,
                }));
            },
            setEdges: (edgesOrUpdater) => {
                set((state) => ({
                    edges:
                        typeof edgesOrUpdater === 'function'
                            ? edgesOrUpdater(state.edges)
                            : edgesOrUpdater,
                }));
            },
            onNodesChange: (changes) => {
                set((state) => ({
                    nodes: applyNodeChanges(changes, state.nodes) as StudioCanvasNode[],
                }));
            },
            onEdgesChange: (changes) => {
                set((state) => ({
                    edges: applyEdgeChanges(changes, state.edges),
                }));
            },
            resetCanvas: (nodes, edges) => {
                set({ nodes, edges });
            },
            updateTaskSampleData: (taskId, data) => {
                set((state) => ({
                    nodes: state.nodes.map(n => 
                        n.id === taskId 
                            ? { ...n, data: { ...n.data, sampleData: data } }
                            : n
                    ) as StudioCanvasNode[]
                }));
            },
        }),
        {
            // Only store state changes when nodes or edges are modified
            partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
            limit: 50, // Keep 50 steps of history
        },
    ),
);
