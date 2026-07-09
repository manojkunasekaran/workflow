import type { Edge } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import {
    ADD_TASK_NODE_ID,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import type { ParallelBranchRow } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import {
    ITERATOR_DONE_NEXT_PARAM,
    ITERATOR_LOOP_BODY_START_PARAM,
} from '@/features/workflow-studio/lib/iteratorLoopSync';
import { parseIteratorActions } from '@/features/workflow-studio/task-type-schema/iteratorTask';

/** Matches terminatesMainSpine() — stops linear spine walks. */
const ROUTING_TERMINATOR_TYPES = new Set([
    'BRANCH',
    'CONDITIONAL',
    'ITERATOR_TASK',
    'HUMAN_TASK',
    'JOIN',
]);

function routingTerminator(type: string): boolean {
    return ROUTING_TERMINATOR_TYPES.has(type);
}

function addRoutingTarget(refs: Set<string>, taskId: string | null | undefined): void {
    const id = String(taskId ?? '').trim();
    if (id) refs.add(id);
}

function addBranchChainRefs(refs: Set<string>, startTaskId: string, chainEdges: Edge[]): void {
    addRoutingTarget(refs, startTaskId);
    for (const id of collectBranchChainTaskIds(startTaskId, chainEdges)) {
        refs.add(id);
    }
}

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
            endTaskId: null,
        }));
        next = next.map((item) => {
            if (item.type !== 'task' || item.id !== branchData.taskId) return item;
            return {
                ...item,
                data: {
                    ...(item.data as TaskNodeData),
                    parameters: injectParameterType('BRANCH', {
                        ...branchData.parameters,
                        joinTaskId: null,
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
                        branchTaskId: null,
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

/**
 * Task ids that belong on branch/loop/conditional paths — never on the main spine.
 * Includes branch-chain descendants so mid-branch steps stay off-spine after save/load.
 */
export function collectOffSpineTaskIds(nodes: StudioCanvasNode[], chainEdges: Edge[]): Set<string> {
    const refs = new Set<string>();

    for (const node of getTaskNodes(nodes)) {
        const data = node.data as TaskNodeData;
        const params = data.parameters;

        if (data.type === 'BRANCH') {
            for (const row of listBranchRows(params)) {
                addBranchChainRefs(refs, String(row.startTaskId ?? '').trim(), chainEdges);
            }
            continue;
        }

        if (data.type === 'CONDITIONAL') {
            const branches = params.branches;
            if (Array.isArray(branches)) {
                for (const entry of branches) {
                    if (entry && typeof entry === 'object') {
                        addRoutingTarget(
                            refs,
                            (entry as Record<string, unknown>).nextTaskId as string | null | undefined,
                        );
                    }
                }
            }
            addRoutingTarget(refs, params.defaultNextTaskId as string | null | undefined);
            continue;
        }

        if (data.type === 'ITERATOR_TASK') {
            addBranchChainRefs(refs, String(params[ITERATOR_LOOP_BODY_START_PARAM] ?? '').trim(), chainEdges);
            addRoutingTarget(refs, params[ITERATOR_DONE_NEXT_PARAM] as string | null | undefined);
            for (const action of parseIteratorActions(params.actions)) {
                refs.add(action.taskId);
            }
            continue;
        }

        if (data.type === 'HUMAN_TASK') {
            addRoutingTarget(refs, params.approvedNextTaskId as string | null | undefined);
            addRoutingTarget(refs, params.rejectedNextTaskId as string | null | undefined);
            continue;
        }
    }

    return refs;
}

function taskTypesById(nodes: StudioCanvasNode[]): Map<string, string> {
    return new Map(getTaskNodes(nodes).map((node) => [node.id, node.data.type]));
}

function computeSpineFromTaskOrder(
    taskIds: string[],
    types: Map<string, string>,
    offSpine: Set<string>,
): string[] {
    const spine: string[] = [];
    for (const taskId of taskIds) {
        if (offSpine.has(taskId)) continue;
        spine.push(taskId);
        if (routingTerminator(types.get(taskId) ?? '')) break;
    }
    return spine;
}

/** Walk the saved main-chain edges from Start, skipping branch-only targets. */
function walkMainSpineFromStart(
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
    offSpine: Set<string>,
): string[] {
    const types = taskTypesById(nodes);
    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));
    const spine: string[] = [];
    let current: string | undefined = WORKFLOW_START_ID;

    while (current) {
        const nextEdge = chainEdges.find(
            (edge) =>
                edge.source === current &&
                !isBranchChainEdgeId(edge.id) &&
                !edge.id.startsWith('route:') &&
                edge.target &&
                edge.target !== ADD_TASK_NODE_ID &&
                taskIds.has(edge.target) &&
                !offSpine.has(edge.target),
        );
        const next = nextEdge?.target;
        if (!next) break;
        spine.push(next);
        if (routingTerminator(types.get(next) ?? '')) break;
        current = next;
    }

    return spine;
}

function spineSequencesEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function resolveMainSpineTaskIds(nodes: StudioCanvasNode[], chainEdges: Edge[]): string[] {
    const offSpine = collectOffSpineTaskIds(nodes, chainEdges);
    const types = taskTypesById(nodes);
    const fromOrder = computeSpineFromTaskOrder(
        getTaskNodes(nodes).map((node) => node.id),
        types,
        offSpine,
    );
    const fromGraph = walkMainSpineFromStart(nodes, chainEdges, offSpine);

    if (fromGraph.length === 0) return fromOrder;
    if (spineSequencesEqual(fromGraph, fromOrder)) return fromGraph;
    // Stale chain edges — trust parameter-derived order (fixes bad branch wiring on load).
    return fromOrder;
}

/** True when a parallel branch wire would target a main-spine step at or before the split node. */
export function isInvalidParallelBranchTarget(
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
    branchTaskId: string,
    targetTaskId: string,
): boolean {
    const spineIds = resolveMainSpineTaskIds(nodes, chainEdges);
    const branchIndex = spineIds.indexOf(branchTaskId);

    // Nested splits live off the main spine — spine index is meaningless for them.
    if (branchIndex < 0) {
        if (spineIds.includes(targetTaskId)) return true;

        const parentBranch = findBranchTaskForChainTask(nodes, branchTaskId, chainEdges);
        if (parentBranch && parentBranch.taskId !== branchTaskId) {
            for (const row of listBranchRows(parentBranch.parameters)) {
                const siblingStart = String(row.startTaskId ?? '').trim();
                if (siblingStart && siblingStart === targetTaskId) return true;
            }
        }
        return false;
    }

    const targetIndex = spineIds.indexOf(targetTaskId);
    if (targetIndex < 0) return false;
    return targetIndex <= branchIndex;
}

/** Whether a branch-chain edge may target a routing node (e.g. a later Split). */
export function isAllowedBranchChainEdge(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    sourceId: string,
    targetId: string,
): boolean {
    const types = taskTypesById(nodes);
    const targetType = types.get(targetId) ?? '';

    if (targetType === 'JOIN') return false;

    const offSpine = collectOffSpineTaskIds(nodes, edges);
    if (!offSpine.has(sourceId)) return false;

    if (targetType !== 'BRANCH') return true;

    const owner = findBranchTaskForChainTask(nodes, sourceId, edges);
    if (owner?.taskId === targetId) return false;

    return true;
}

/** Drop branch-chain edges that incorrectly link branch paths into routing nodes. */
export function sanitizeInvalidBranchChainEdges(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): Edge[] {
    return edges.filter((edge) => {
        if (!isBranchChainEdgeId(edge.id)) return true;
        const source = edge.source ?? '';
        const target = edge.target ?? '';
        if (!source || !target) return false;
        return isAllowedBranchChainEdge(nodes, edges, source, target);
    });
}

/** Drop legacy nextTaskId mistakenly stored on BRANCH tasks. */
export function stripLegacyBranchNextTaskId(nodes: StudioCanvasNode[]): StudioCanvasNode[] {
    let changed = false;
    const next = nodes.map((node) => {
        if (node.type !== 'task' || (node.data as TaskNodeData).type !== 'BRANCH') return node;
        const branchData = node.data as TaskNodeData;
        if (branchData.parameters.nextTaskId == null) return node;
        changed = true;
        const { nextTaskId: _removed, ...rest } = branchData.parameters;
        return {
            ...node,
            data: {
                ...branchData,
                parameters: injectParameterType('BRANCH', rest),
            },
        };
    });
    return changed ? next : nodes;
}

/** Clear branch starts that incorrectly reference main-spine predecessors. */
export function sanitizeBranchSpineConflicts(
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
): StudioCanvasNode[] {
    const spineIds = resolveMainSpineTaskIds(nodes, chainEdges);
    const branchIndexById = new Map(spineIds.map((id, index) => [id, index]));
    let next = nodes;

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'BRANCH') continue;
        const branchData = node.data as TaskNodeData;
        const branchIndex = branchIndexById.get(branchData.taskId);
        if (branchIndex === undefined) continue;

        const rows = listBranchRows(branchData.parameters);
        let changed = false;
        const nextRows = rows.map((row) => {
            const startTaskId = String(row.startTaskId ?? '').trim();
            if (!startTaskId) return row;
            const startIndex = spineIds.indexOf(startTaskId);
            if (startIndex >= 0 && startIndex <= branchIndex) {
                changed = true;
                return { ...row, startTaskId: '' };
            }
            return row;
        });

        if (!changed) continue;

        next = next.map((item) => {
            if (item.type !== 'task' || item.id !== branchData.taskId) return item;
            return {
                ...item,
                data: {
                    ...branchData,
                    parameters: injectParameterType('BRANCH', {
                        ...branchData.parameters,
                        branches: nextRows,
                    }),
                },
            };
        });
    }

    return next;
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
