import type { Edge } from '@xyflow/react';
import { isBranchChainEdgeId, parBranchHandle } from '@/features/workflow-studio/lib/graphHandles';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import type { ParallelBranchRow } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';

export interface WorkflowGraphTask {
    taskId: string;
    type: string;
    parameters: Record<string, unknown>;
}

export interface WorkflowGraph {
    tasks: Map<string, WorkflowGraphTask>;
    chainOut: Map<string, string>;
    joinInbounds: Map<string, string[]>;
}

export interface BranchPath {
    branchIndex: number;
    startTaskId: string;
    tipTaskId: string;
}

/** Declared fork wire from a BRANCH parallel port to the first task on that path. */
export interface BranchForkWire {
    branchTaskId: string;
    rowIndex: number;
    targetTaskId: string;
    label: string;
    sourceHandle: string;
}

function normalize(value: unknown): string {
    return String(value ?? '').trim();
}

function listBranchRows(parameters: Record<string, unknown>): ParallelBranchRow[] {
    const raw = parameters.branches;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is ParallelBranchRow => Boolean(item) && typeof item === 'object');
}

export function buildWorkflowGraphFromCanvas(nodes: StudioCanvasNode[], edges: Edge[]): WorkflowGraph {
    const tasks = new Map<string, WorkflowGraphTask>();
    for (const node of getTaskNodes(nodes)) {
        const data = node.data as TaskNodeData;
        tasks.set(data.taskId, {
            taskId: data.taskId,
            type: data.type,
            parameters: data.parameters,
        });
    }

    const chainOut = new Map<string, string>();
    for (const edge of edges) {
        if (!isBranchChainEdgeId(edge.id)) continue;
        const source = normalize(edge.source);
        const target = normalize(edge.target);
        if (source && target) {
            chainOut.set(source, target);
        }
    }

    const joinInbounds = new Map<string, string[]>();
    for (const task of tasks.values()) {
        if (task.type !== 'JOIN') continue;
        const inboundIds = Array.isArray(task.parameters.inboundTaskIds)
            ? task.parameters.inboundTaskIds.map((id) => normalize(id)).filter(Boolean)
            : [];
        if (inboundIds.length > 0) {
            joinInbounds.set(task.taskId, inboundIds);
        }
    }

    return { tasks, chainOut, joinInbounds };
}

export function buildWorkflowGraphFromContract(graphNode: {
    tasks: Record<string, { type: string; parameters?: Record<string, unknown> }>;
    chainOut?: Record<string, string>;
    joinInbounds?: Record<string, string[]>;
}): WorkflowGraph {
    const tasks = new Map<string, WorkflowGraphTask>();
    for (const [taskId, task] of Object.entries(graphNode.tasks)) {
        tasks.set(taskId, {
            taskId,
            type: task.type,
            parameters: task.parameters ?? {},
        });
    }

    const chainOut = new Map<string, string>(Object.entries(graphNode.chainOut ?? {}));
    const joinInbounds = new Map<string, string[]>(
        Object.entries(graphNode.joinInbounds ?? {}).map(([joinId, inboundIds]) => [joinId, [...inboundIds]]),
    );

    return { tasks, chainOut, joinInbounds };
}

function isSiblingBranchStart(
    ownerBranchId: string,
    candidateTaskId: string,
    pathStartTaskId: string,
    graph: WorkflowGraph,
): boolean {
    const owner = graph.tasks.get(ownerBranchId);
    if (!owner || owner.type !== 'BRANCH') return false;

    for (const row of listBranchRows(owner.parameters)) {
        const rowStart = normalize(row.startTaskId);
        if (!rowStart || rowStart === pathStartTaskId) continue;
        if (rowStart === candidateTaskId) return true;
    }
    return false;
}

function isReachableOnBranchPath(
    rowStart: string,
    targetTaskId: string,
    ownerBranchId: string,
    graph: WorkflowGraph,
): boolean {
    let current: string | undefined = rowStart;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
        visited.add(current);
        if (current === targetTaskId) return true;

        const next = normalize(graph.chainOut.get(current));
        if (!next) return false;
        if (isSiblingBranchStart(ownerBranchId, next, rowStart, graph)) return false;

        const nextTask = graph.tasks.get(next);
        if (nextTask?.type === 'JOIN') return false;
        current = next;
    }
    return false;
}

/** BRANCH that owns `taskId` on a fork path (split node or any task reachable from a branch row). */
function findEnclosingBranchTaskId(taskId: string, graph: WorkflowGraph): string | null {
    const normalized = normalize(taskId);
    if (!normalized) return null;

    for (const task of graph.tasks.values()) {
        if (task.type !== 'BRANCH') continue;
        if (normalized === task.taskId) {
            const parent = findEnclosingBranchTaskIdForSplit(task.taskId, graph);
            return parent ?? task.taskId;
        }
        for (const row of listBranchRows(task.parameters)) {
            const rowStart = normalize(row.startTaskId);
            if (!rowStart) continue;
            if (normalized === rowStart) return task.taskId;
            if (isReachableOnBranchPath(rowStart, normalized, task.taskId, graph)) {
                return task.taskId;
            }
        }
    }
    return null;
}

function findEnclosingBranchTaskIdForSplit(splitTaskId: string, graph: WorkflowGraph): string | null {
    for (const task of graph.tasks.values()) {
        if (task.type !== 'BRANCH') continue;
        for (const row of listBranchRows(task.parameters)) {
            const rowStart = normalize(row.startTaskId);
            if (!rowStart) continue;
            if (rowStart === splitTaskId) return task.taskId;
            if (isReachableOnBranchPath(rowStart, splitTaskId, task.taskId, graph)) {
                return task.taskId;
            }
        }
    }
    return null;
}

function findOwnerBranchId(startTaskId: string, graph: WorkflowGraph): string | null {
    for (const task of graph.tasks.values()) {
        if (task.type !== 'BRANCH') continue;
        for (const row of listBranchRows(task.parameters)) {
            const rowStart = normalize(row.startTaskId);
            if (rowStart === startTaskId) return task.taskId;
            if (rowStart && isReachableOnBranchPath(rowStart, startTaskId, task.taskId, graph)) {
                return task.taskId;
            }
        }
    }
    return null;
}

export function resolveBranchPathTip(
    startTaskId: string,
    graph: WorkflowGraph,
    joinTaskId?: string | null,
): string {
    const normalizedStart = normalize(startTaskId);
    if (!normalizedStart) return '';

    const ownerBranchId = findOwnerBranchId(normalizedStart, graph);
    let current: string | undefined = normalizedStart;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
        visited.add(current);

        if (joinTaskId && isInboundForJoin(current, joinTaskId, graph)) {
            return current;
        }

        const task = graph.tasks.get(current);
        if (task?.type === 'JOIN') {
            return current;
        }

        const next = normalize(graph.chainOut.get(current));
        if (!next) {
            return current;
        }

        if (ownerBranchId && isSiblingBranchStart(ownerBranchId, next, normalizedStart, graph)) {
            return current;
        }

        const nextTask = graph.tasks.get(next);
        if (nextTask?.type === 'JOIN') {
            return current;
        }

        current = next;
    }

    return current ?? '';
}

/** All BRANCH fork wires declared via `branches[].startTaskId`. */
export function resolveBranchForkWires(graph: WorkflowGraph): BranchForkWire[] {
    const wires: BranchForkWire[] = [];

    for (const task of graph.tasks.values()) {
        if (task.type !== 'BRANCH') continue;
        const rows = listBranchRows(task.parameters);
        for (let index = 0; index < rows.length; index += 1) {
            const targetTaskId = normalize(rows[index]?.startTaskId);
            if (!targetTaskId) continue;
            const label = normalize(rows[index]?.branchName) || `Branch ${index + 1}`;
            wires.push({
                branchTaskId: task.taskId,
                rowIndex: index,
                targetTaskId,
                label,
                sourceHandle: parBranchHandle(index),
            });
        }
    }

    return wires;
}

/**
 * Whether a BRANCH row may fork to `targetTaskId`.
 * Uses topology reachability — not flat task array order (supports nested + cross-path forks).
 */
export function isValidBranchForkTarget(
    branchTaskId: string,
    targetTaskId: string,
    graph: WorkflowGraph,
    spineTaskIds: string[],
): boolean {
    const branchId = normalize(branchTaskId);
    const targetId = normalize(targetTaskId);
    if (!branchId || !targetId || branchId === targetId) return false;

    const branch = graph.tasks.get(branchId);
    const target = graph.tasks.get(targetId);
    if (!branch || branch.type !== 'BRANCH' || !target) return false;
    if (target.type === 'JOIN') return false;

    const branchIndex = spineTaskIds.indexOf(branchId);

    if (branchIndex < 0) {
        if (spineTaskIds.includes(targetId)) return false;

        const parentBranchId = findEnclosingBranchTaskIdForSplit(branchId, graph);
        if (parentBranchId) {
            const parent = graph.tasks.get(parentBranchId);
            if (parent?.type === 'BRANCH') {
                for (const row of listBranchRows(parent.parameters)) {
                    const siblingStart = normalize(row.startTaskId);
                    if (siblingStart && siblingStart === targetId) return false;
                }
            }
        }
        return true;
    }

    const targetIndex = spineTaskIds.indexOf(targetId);
    if (targetIndex < 0) return true;
    return targetIndex > branchIndex;
}

/** Set `branches[rowIndex].startTaskId` for a BRANCH split (single fork write path). */
export function wireBranchFork(
    nodes: StudioCanvasNode[],
    branchTaskId: string,
    rowIndex: number,
    targetTaskId: string,
): StudioCanvasNode[] | null {
    const branchNode = nodes.find((node) => node.id === branchTaskId && node.type === 'task');
    if (!branchNode) return null;

    const data = branchNode.data as TaskNodeData;
    if (data.type !== 'BRANCH') return null;

    const target = normalize(targetTaskId);
    if (!target) return null;

    const rows = listBranchRows(data.parameters);
    const grown: ParallelBranchRow[] = [...rows];
    while (grown.length <= rowIndex) {
        grown.push({ branchName: `Branch ${grown.length + 1}`, startTaskId: '' });
    }

    const nextRows = grown.map((row, index) =>
        index === rowIndex ? { ...row, startTaskId: target } : row,
    );

    return nodes.map((node) => {
        if (node.type !== 'task' || node.id !== branchTaskId) return node;
        return {
            ...node,
            data: {
                ...data,
                parameters: injectParameterType('BRANCH', {
                    ...data.parameters,
                    branches: nextRows,
                }),
            },
        };
    });
}

export function resolveJoinInbounds(joinTaskId: string, graph: WorkflowGraph): string[] {
    const joinId = normalize(joinTaskId);
    if (!joinId) return [];
    const join = graph.tasks.get(joinId);
    if (!join || join.type !== 'JOIN') return [];
    const inboundIds = join.parameters.inboundTaskIds;
    if (!Array.isArray(inboundIds)) return [];
    return inboundIds.map((id) => normalize(id)).filter(Boolean);
}

export function resolveBranchPaths(branchTaskId: string, graph: WorkflowGraph): BranchPath[] {
    const branch = graph.tasks.get(branchTaskId);
    if (!branch || branch.type !== 'BRANCH') return [];

    const paths: BranchPath[] = [];
    const rows = listBranchRows(branch.parameters);
    for (let index = 0; index < rows.length; index += 1) {
        const startTaskId = normalize(rows[index]?.startTaskId);
        if (!startTaskId) continue;
        paths.push({
            branchIndex: index,
            startTaskId,
            tipTaskId: resolveBranchPathTip(startTaskId, graph),
        });
    }
    return paths;
}

export function isInboundForJoin(taskId: string, joinTaskId: string, graph: WorkflowGraph): boolean {
    return resolveJoinInbounds(joinTaskId, graph).includes(normalize(taskId));
}

export function isLeafInbound(taskId: string, joinTaskId: string, graph: WorkflowGraph): boolean {
    if (!isInboundForJoin(taskId, joinTaskId, graph)) return false;
    const task = graph.tasks.get(normalize(taskId));
    if (!task) return false;
    return task.type !== 'BRANCH' && task.type !== 'JOIN';
}

export function collectSpawnTree(branchTaskId: string, graph: WorkflowGraph): Set<string> {
    const collected = new Set<string>();
    collectSpawnTreeRecursive(branchTaskId, graph, collected, new Set<string>());
    return collected;
}

function collectSpawnTreeRecursive(
    branchTaskId: string,
    graph: WorkflowGraph,
    collected: Set<string>,
    processedBranches: Set<string>,
): void {
    if (processedBranches.has(branchTaskId)) return;
    processedBranches.add(branchTaskId);
    collected.add(branchTaskId);

    const branch = graph.tasks.get(branchTaskId);
    if (!branch || branch.type !== 'BRANCH') return;

    for (const row of listBranchRows(branch.parameters)) {
        const startTaskId = normalize(row.startTaskId);
        if (!startTaskId) continue;
        collectPathTasks(startTaskId, branchTaskId, graph, collected, processedBranches);
    }
}

function collectPathTasks(
    startTaskId: string,
    ownerBranchId: string,
    graph: WorkflowGraph,
    collected: Set<string>,
    processedBranches: Set<string>,
): void {
    let current: string | undefined = startTaskId;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
        visited.add(current);
        collected.add(current);

        const task = graph.tasks.get(current);
        if (task?.type === 'BRANCH') {
            collectSpawnTreeRecursive(current, graph, collected, processedBranches);
        }

        const next = normalize(graph.chainOut.get(current));
        if (!next) return;
        if (isSiblingBranchStart(ownerBranchId, next, startTaskId, graph)) return;

        const nextTask = graph.tasks.get(next);
        if (nextTask?.type === 'JOIN') return;
        current = next;
    }
}

/** Resolve branch path tip for a BRANCH row index on the canvas. */
export function resolveBranchTipForRow(
    branchData: TaskNodeData,
    branchIndex: number,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): string {
    const rows = listBranchRows(branchData.parameters);
    const startTaskId = normalize(rows[branchIndex]?.startTaskId);
    if (!startTaskId) return '';
    const graph = buildWorkflowGraphFromCanvas(nodes, edges);
    return resolveBranchPathTip(startTaskId, graph);
}

export function addJoinInbound(
    parameters: Record<string, unknown>,
    inboundTaskId: string,
): Record<string, unknown> {
    const inbound = normalize(inboundTaskId);
    if (!inbound) return parameters;
    const current = Array.isArray(parameters.inboundTaskIds)
        ? parameters.inboundTaskIds.map((id) => normalize(id)).filter(Boolean)
        : [];
    if (current.includes(inbound)) return parameters;
    return { ...parameters, inboundTaskIds: [...current, inbound] };
}

export function removeJoinInbound(
    parameters: Record<string, unknown>,
    inboundTaskId: string,
): Record<string, unknown> {
    const inbound = normalize(inboundTaskId);
    if (!inbound || !Array.isArray(parameters.inboundTaskIds)) return parameters;
    return {
        ...parameters,
        inboundTaskIds: parameters.inboundTaskIds
            .map((id) => normalize(id))
            .filter((id) => id && id !== inbound),
    };
}
