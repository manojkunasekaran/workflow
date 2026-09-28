import type { Edge } from '@xyflow/react';
import type { WorkflowTask } from '@/types/api';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { collectBranchChainTaskIds } from '@/features/workflow-studio/lib/joinWiring';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import {
    buildWorkflowGraphFromCanvas,
    isLeafInbound,
    isValidBranchForkTarget,
    resolveJoinInbounds,
} from '@/features/workflow-studio/lib/workflowTopology';
import { resolveMainSpineTaskIds } from '@/features/workflow-studio/lib/joinWiring';
import type { ParallelBranchRow } from '@/features/workflow-studio/task-type-schema/types';

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
        const spineIndex = spineIds.indexOf(task.taskId);
        const nextSpineId = spineIndex >= 0 ? spineIds[spineIndex + 1] : tasks[index + 1]?.taskId;

        const updatedTask = { ...task };
        updatedTask.nextTaskId = nextSpineId || undefined;

        if (updatedTask.type === 'HUMAN_TASK') {
            const params = updatedTask.parameters ? { ...(updatedTask.parameters as Record<string, unknown>) } : {};
            const approved = String(params.approvedNextTaskId ?? '').trim();
            if (!approved) {
                updatedTask.parameters = injectParameterType('HUMAN_TASK', {
                    ...params,
                    approvedNextTaskId: nextSpineId || undefined,
                });
            }
        }

        return updatedTask;
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

    const forkError = validateBranchForkTargets(nodes, edges);
    if (forkError) return forkError;

    const topologyError = validateBranchJoinTopology(nodes, edges);
    if (topologyError) return topologyError;

    return null;
}

function validateBranchForkTargets(nodes: StudioCanvasNode[], edges: Edge[]): string | null {
    const graph = buildWorkflowGraphFromCanvas(nodes, edges);
    const spineIds = resolveMainSpineTaskIds(nodes, edges);

    for (const node of getTaskNodes(nodes)) {
        const data = node.data as TaskNodeData;
        if (data.type !== 'BRANCH') continue;

        const rows = Array.isArray(data.parameters.branches) ? data.parameters.branches : [];
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index] as ParallelBranchRow;
            const startTaskId = String(row?.startTaskId ?? '').trim();
            if (!startTaskId) continue;
            if (!isValidBranchForkTarget(data.taskId, startTaskId, graph, spineIds)) {
                const branchLabel = String(row.branchName ?? `Branch ${index + 1}`).trim();
                return `${data.displayName || data.taskId}: "${branchLabel}" cannot fork to ${startTaskId}`;
            }
        }
    }

    return null;
}

/** BRANCH/JOIN topology rules aligned with backend WorkflowDefinitionValidator. */
export function validateBranchJoinTopology(nodes: StudioCanvasNode[], edges: Edge[]): string | null {
    const graph = buildWorkflowGraphFromCanvas(nodes, edges);
    const inboundOwner = new Map<string, string>();

    for (const edge of edges) {
        if (!isBranchChainEdgeId(edge.id)) continue;
        const targetNode = getTaskNodes(nodes).find((node) => node.id === edge.target);
        if (targetNode?.data.type === 'JOIN') {
            const label = targetNode.data.displayName || targetNode.data.taskId;
            return `${label}: branch-chain edges cannot target JOIN directly`;
        }
    }

    for (const node of getTaskNodes(nodes)) {
        const data = node.data as TaskNodeData;
        if (data.type !== 'JOIN') continue;

        const joinId = data.taskId;
        const inboundTaskIds = resolveJoinInbounds(joinId, graph);

        if (inboundTaskIds.length === 0) {
            return `${data.displayName || joinId}: at least one inbound task is required`;
        }

        const seen = new Set<string>();
        for (const inboundId of inboundTaskIds) {
            if (!seen.add(inboundId)) {
                return `${data.displayName || joinId}: duplicate inbound task ${inboundId}`;
            }
            if (inboundId === joinId) {
                return `${data.displayName || joinId}: cannot reference itself as inbound`;
            }
            if (!graph.tasks.has(inboundId)) {
                return `${data.displayName || joinId}: unknown inbound task ${inboundId}`;
            }
            if (!isLeafInbound(inboundId, joinId, graph)) {
                return `${data.displayName || joinId}: inbound ${inboundId} must be a leaf task`;
            }
            const previousOwner = inboundOwner.get(inboundId);
            if (previousOwner) {
                return `Task ${inboundId} is wired to multiple JOIN nodes`;
            }
            inboundOwner.set(inboundId, joinId);
        }
    }

    for (const node of getTaskNodes(nodes)) {
        const data = node.data as TaskNodeData;
        if (data.type !== 'BRANCH') continue;
        if ('joinTaskId' in data.parameters && data.parameters.joinTaskId) {
            return `${data.displayName || data.taskId}: joinTaskId is no longer supported`;
        }
        const rows = Array.isArray(data.parameters.branches) ? data.parameters.branches : [];
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i] as Record<string, unknown>;
            if (row?.endTaskId) {
                return `${data.displayName || data.taskId}: branches[${i}].endTaskId is no longer supported`;
            }
        }
    }

    return null;
}
