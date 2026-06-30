import type { Edge } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import type { ParallelBranchRow } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';

export type WireGraphContext = {
    workflowTasks: TaskNodeData[];
};

function listBranchRows(parameters: Record<string, unknown>): ParallelBranchRow[] {
    const raw = parameters.branches;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is ParallelBranchRow => Boolean(item) && typeof item === 'object');
}

export function resolveLinkedBranchData(
    joinData: TaskNodeData,
    context?: WireGraphContext,
): TaskNodeData | null {
    if (!context) return null;

    const branchTaskId = String(joinData.parameters.branchTaskId ?? '').trim();
    if (branchTaskId) {
        const linked = context.workflowTasks.find((task) => task.taskId === branchTaskId);
        if (linked) return linked;
    }

    return (
        context.workflowTasks.find(
            (task) =>
                task.type === 'BRANCH' &&
                String(task.parameters.joinTaskId ?? '').trim() === joinData.taskId,
        ) ?? null
    );
}

export function isTaskBranchEnd(
    nodes: StudioCanvasNode[],
    taskId: string,
    chainEdges: Edge[],
): boolean {
    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'BRANCH') continue;
        const branchData = node.data as TaskNodeData;
        const joinTaskId = String(branchData.parameters.joinTaskId ?? '').trim();
        if (!joinTaskId || !taskIds.has(joinTaskId)) continue;

        const index = resolveBranchIndexForEndTask(branchData, taskId, chainEdges);
        if (index === null) continue;
        if (readBranchEndTaskId(branchData, index) === taskId) return true;
    }
    return false;
}

/** Clear stale split/join links when a referenced task no longer exists on the canvas. */
export function sanitizeDanglingBranchJoinReferences(nodes: StudioCanvasNode[]): StudioCanvasNode[] {
    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));
    let next = nodes;

    for (const node of getTaskNodes(next)) {
        if (node.data.type !== 'BRANCH') continue;
        const branchData = node.data as TaskNodeData;
        const joinTaskId = String(branchData.parameters.joinTaskId ?? '').trim();
        if (!joinTaskId || taskIds.has(joinTaskId)) continue;

        const rows = listBranchRows(branchData.parameters).map((row) => ({
            ...row,
            endTaskId: '',
        }));
        next = next.map((item) => {
            if (item.type !== 'task' || item.id !== branchData.taskId) return item;
            return {
                ...item,
                data: {
                    ...(item.data as TaskNodeData),
                    parameters: injectParameterType('BRANCH', {
                        ...branchData.parameters,
                        joinTaskId: '',
                        branches: rows,
                    }),
                },
            };
        });
    }

    for (const node of getTaskNodes(next)) {
        if (node.data.type !== 'JOIN') continue;
        const joinData = node.data as TaskNodeData;
        const branchTaskId = String(joinData.parameters.branchTaskId ?? '').trim();
        if (!branchTaskId || taskIds.has(branchTaskId)) continue;

        next = next.map((item) => {
            if (item.type !== 'task' || item.id !== joinData.taskId) return item;
            return {
                ...item,
                data: {
                    ...(item.data as TaskNodeData),
                    parameters: injectParameterType('JOIN', {
                        ...joinData.parameters,
                        branchTaskId: '',
                    }),
                },
            };
        });
    }

    return next;
}

export function readBranchEndTaskId(branchData: TaskNodeData, index: number): string {
    const rows = listBranchRows(branchData.parameters);
    const row = rows[index];
    if (!row) return '';
    return String(row.endTaskId ?? '').trim();
}

export function writeBranchEndTaskId(
    branchData: TaskNodeData,
    index: number,
    endTaskId: string | null,
): Record<string, unknown> {
    const rows = listBranchRows(branchData.parameters);
    const nextRows = rows.map((row, i) =>
        i === index ? { ...row, endTaskId: endTaskId ?? '' } : row,
    );
    return injectParameterType(branchData.type, {
        ...branchData.parameters,
        branches: nextRows,
    });
}

/** Tasks reachable from a branch start via branch-chain edges (includes the start task). */
export function collectBranchChainTaskIds(
    startTaskId: string,
    chainEdges: Edge[],
): Set<string> {
    const chain = new Set<string>();
    let current: string | undefined = startTaskId;
    while (current) {
        chain.add(current);
        const nextEdge = chainEdges.find(
            (edge) => isBranchChainEdgeId(edge.id) && edge.source === current,
        );
        current = nextEdge?.target;
    }
    return chain;
}

export function resolveBranchIndexForEndTask(
    branchData: TaskNodeData,
    taskId: string,
    chainEdges: Edge[],
): number | null {
    const rows = listBranchRows(branchData.parameters);
    for (let i = 0; i < rows.length; i++) {
        const startTaskId = String(rows[i].startTaskId ?? '').trim();
        if (!startTaskId) continue;
        if (taskId === startTaskId) return i;
        if (collectBranchChainTaskIds(startTaskId, chainEdges).has(taskId)) return i;
    }
    return null;
}

export function findBranchTaskForChainTask(
    nodes: StudioCanvasNode[],
    taskId: string,
    chainEdges: Edge[],
): TaskNodeData | null {
    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'BRANCH') continue;
        const index = resolveBranchIndexForEndTask(node.data as TaskNodeData, taskId, chainEdges);
        if (index !== null) return node.data as TaskNodeData;
    }
    return null;
}

export function syncBranchJoinPair(
    nodes: StudioCanvasNode[],
    branchTaskId: string,
    joinTaskId: string,
): StudioCanvasNode[] {
    const branchNode = getTaskNodes(nodes).find((node) => node.id === branchTaskId);
    const joinNode = getTaskNodes(nodes).find((node) => node.id === joinTaskId);
    if (!branchNode || !joinNode) return nodes;

    const branchData = branchNode.data as TaskNodeData;
    const joinData = joinNode.data as TaskNodeData;

    return nodes.map((node) => {
        if (node.id === branchTaskId && node.type === 'task') {
            return {
                ...node,
                data: {
                    ...(node.data as TaskNodeData),
                    parameters: injectParameterType('BRANCH', {
                        ...branchData.parameters,
                        joinTaskId: joinTaskId,
                    }),
                },
            };
        }
        if (node.id === joinTaskId && node.type === 'task') {
            return {
                ...node,
                data: {
                    ...(node.data as TaskNodeData),
                    parameters: injectParameterType('JOIN', {
                        ...joinData.parameters,
                        branchTaskId: branchTaskId,
                    }),
                },
            };
        }
        return node;
    });
}
