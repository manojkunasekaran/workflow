import type { Edge } from '@xyflow/react';
import type { WorkflowDefinition, WorkflowTask } from '@/types/api';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { collectBranchChainTaskIds } from '@/features/workflow-studio/lib/joinWiring';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';

/** Sync route edge targets back into task parameters before export. */
export function syncRouteParamsFromEdges(nodes: StudioCanvasNode[], edges: Edge[]): StudioCanvasNode[] {
    const routeEdges = edges.filter((edge) => edge.type === 'route' && edge.target);
    if (routeEdges.length === 0) {
        return nodes;
    }

    const updates = new Map<string, Record<string, unknown>>();

    for (const edge of routeEdges) {
        const sourceNode = getTaskNodes(nodes).find((node) => node.id === edge.source);
        if (!sourceNode || sourceNode.type !== 'task') continue;

        const plugin = getTaskTypePlugin((sourceNode.data as TaskNodeData).type);
        const wiring = plugin?.wiring;
        if (!wiring) continue;

        const handle = edge.sourceHandle ?? '';
        for (const output of wiring.outputs) {
            if (output.kind === 'param' && output.handleId === handle) {
                const data = sourceNode.data as TaskNodeData;
                const bucket = updates.get(sourceNode.id) ?? { ...data.parameters };
                bucket[output.paramKey] = edge.target;
                updates.set(sourceNode.id, bucket);
            }
        }
    }

    if (updates.size === 0) {
        return nodes;
    }

    return nodes.map((node) => {
        const nextParams = updates.get(node.id);
        if (!nextParams || node.type !== 'task') return node;
        const data = node.data as TaskNodeData;
        return {
            ...node,
            data: {
                ...data,
                parameters: nextParams,
            },
        };
    });
}

/** Lenient defaults: human approved path defaults to main-spine successor. */
export function applyRoutingDefaults(
    tasks: WorkflowTask[],
    spineIds: string[],
): WorkflowTask[] {
    return tasks.map((task, index) => {
        if (task.type !== 'HUMAN_TASK') return task;
        const params = { ...(task.parameters as Record<string, unknown>) };
        const approved = String(params.approvedNextTaskId ?? '').trim();
        if (approved) return task;

        const spineIndex = spineIds.indexOf(task.taskId);
        const nextSpineId = spineIndex >= 0 ? spineIds[spineIndex + 1] : tasks[index + 1]?.taskId;
        if (!nextSpineId) return task;

        return {
            ...task,
            parameters: injectParameterType('HUMAN_TASK', {
                ...params,
                approvedNextTaskId: nextSpineId,
            }),
        };
    });
}

/** Hard graph rules checked on save/run. */
export function validateWorkflowGraph(nodes: StudioCanvasNode[], edges: Edge[]): string | null {
    const branchChainIds = new Set<string>();
    for (const edge of edges) {
        if (!isBranchChainEdgeId(edge.id) || !edge.source) continue;
        for (const id of collectBranchChainTaskIds(edge.source, edges)) {
            branchChainIds.add(id);
        }
    }

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type === 'HUMAN_TASK' && branchChainIds.has(node.data.taskId)) {
            const label = node.data.displayName || node.data.taskId;
            return `${label}: Human approval tasks cannot run inside parallel branches`;
        }
    }

    return null;
}
