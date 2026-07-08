import type { Edge } from '@xyflow/react';
import type { NodePosition, WorkflowDefinition, WorkflowTask } from '@/types/api';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import {
    BRANCH_CHAIN_PREFIX,
    isBranchChainEdgeId,
    MAIN_IN,
    MAIN_OUT,
} from '@/features/workflow-studio/lib/graphHandles';
import { resolveMainSpineTaskIds } from '@/features/workflow-studio/lib/joinWiring';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import type { ParallelBranchRow } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import {
    STUDIO_EDGE_CLASS,
    STUDIO_SEQUENCE_STROKE,
    studioEdgeMarkerEnd,
} from '@/features/workflow-studio/edges/studioEdgeTheme';

function listBranchRows(parameters: Record<string, unknown>): ParallelBranchRow[] {
    const raw = parameters.branches;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is ParallelBranchRow => Boolean(item) && typeof item === 'object');
}

export function makeBranchChainEdge(source: string, target: string): Edge {
    return {
        id: `${BRANCH_CHAIN_PREFIX}${source}->${target}`,
        source,
        sourceHandle: MAIN_OUT,
        target,
        targetHandle: MAIN_IN,
        type: 'studioChain',
        className: STUDIO_EDGE_CLASS,
        markerEnd: studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE),
    };
}

export function readStudioChainOut(layout: WorkflowDefinition['layout'], taskId: string): string {
    const entry = layout?.[taskId];
    if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'studioChainOut')) return '';
    const wire = entry.studioChainOut;
    return wire == null ? '' : String(wire).trim();
}

/** Rebuild branch-chain edges from per-node layout metadata saved on export. */
export function buildBranchChainEdgesFromLayout(
    layout: WorkflowDefinition['layout'],
    taskIds?: Set<string>,
): Edge[] {
    if (!layout) return [];
    const edges: Edge[] = [];
    for (const [sourceId] of Object.entries(layout)) {
        if (sourceId.startsWith('__')) continue;
        const target = readStudioChainOut(layout, sourceId);
        if (!target || target.startsWith('__')) continue;
        if (taskIds && (!taskIds.has(sourceId) || !taskIds.has(target))) continue;
        edges.push(makeBranchChainEdge(sourceId, target));
    }
    return edges;
}

/** Fallback when older workflows lack studioChainOut — infer from task array order. */
export function inferBranchChainEdgesFromTaskOrder(tasks: WorkflowTask[]): Edge[] {
    const taskIds = tasks.map((task) => task.taskId);
    const types = new Map(tasks.map((task) => [task.taskId, task.type]));
    const edges: Edge[] = [];

    for (const task of tasks) {
        if (task.type !== 'BRANCH') continue;
        const params = task.parameters as Record<string, unknown>;
        const rows = listBranchRows(params);
        const joinId = String(params.joinTaskId ?? '').trim();
        const starts = new Set(
            rows.map((row) => String(row.startTaskId ?? '').trim()).filter(Boolean),
        );

        for (const row of rows) {
            const startId = String(row.startTaskId ?? '').trim();
            if (!startId) continue;
            const startIdx = taskIds.indexOf(startId);
            if (startIdx < 0) continue;

            let current = startId;
            const endId = String(row.endTaskId ?? '').trim();

            for (let i = startIdx + 1; i < taskIds.length; i++) {
                const nextId = taskIds[i];
                if (starts.has(nextId) && nextId !== startId) break;
                if (joinId && nextId === joinId) break;
                if ((types.get(nextId) ?? '') === 'JOIN') break;

                const nextType = types.get(nextId) ?? '';
                edges.push(makeBranchChainEdge(current, nextId));
                current = nextId;

                if (endId && nextId === endId) break;
                if (nextType === 'BRANCH') break;
            }
        }
    }

    return edges;
}

export function restoreBranchChainEdges(definition: WorkflowDefinition): Edge[] {
    const taskIds = new Set(definition.tasks.map((task) => task.taskId));
    const fromInfer = inferBranchChainEdgesFromTaskOrder(definition.tasks);
    const fromLayout = buildBranchChainEdgesFromLayout(definition.layout, taskIds);
    const merged = new Map<string, Edge>();
    for (const edge of fromInfer) merged.set(edge.id, edge);
    for (const edge of fromLayout) merged.set(edge.id, edge);
    return [...merged.values()];
}

function branchChainTip(startId: string, edges: Edge[]): string {
    let current = startId;
    while (true) {
        const next = edges.find((edge) => isBranchChainEdgeId(edge.id) && edge.source === current)
            ?.target;
        if (!next) return current;
        current = next;
    }
}

/** Keep branch endTaskId aligned with the last step on each branch path. */
export function syncBranchEndTaskIdsFromChains(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): StudioCanvasNode[] {
    let next = nodes;

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'BRANCH') continue;
        const branchData = node.data as TaskNodeData;
        const rows = listBranchRows(branchData.parameters);
        let changed = false;

        const nextRows = rows.map((row) => {
            const startId = String(row.startTaskId ?? '').trim();
            if (!startId) return row;
            const tip = branchChainTip(startId, edges);
            const currentEnd = String(row.endTaskId ?? '').trim();
            if (currentEnd === tip) return row;
            changed = true;
            return { ...row, endTaskId: tip };
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

/** Persist branch-chain successors into layout (mirrors iterator studioDoneWire). */
export function applyStudioChainOutToLayout(
    layout: Record<string, NodePosition>,
    edges: Edge[],
): Record<string, NodePosition> {
    const next: Record<string, NodePosition> = { ...layout };
    const chainOutBySource = new Map<string, string>();

    for (const edge of edges) {
        if (!isBranchChainEdgeId(edge.id)) continue;
        const source = String(edge.source ?? '').trim();
        const target = String(edge.target ?? '').trim();
        if (source && target) chainOutBySource.set(source, target);
    }

    for (const [taskId, entry] of Object.entries(next)) {
        const target = chainOutBySource.get(taskId);
        if (target) {
            next[taskId] = { ...entry, studioChainOut: target };
            continue;
        }
        if (!Object.prototype.hasOwnProperty.call(entry, 'studioChainOut')) continue;
        const { studioChainOut: _removed, ...rest } = entry;
        next[taskId] = rest;
    }

    return next;
}

/** Order tasks for export: spine first, then each branch path chain in branch-index order. */
export function orderTaskIdsForExport(nodes: StudioCanvasNode[], edges: Edge[]): string[] {
    const chainEdges = edges.filter((edge) => isBranchChainEdgeId(edge.id));
    const spineIds = resolveMainSpineTaskIds(nodes, chainEdges);
    const ordered: string[] = [];
    const seen = new Set<string>();

    const appendParallelBranchChains = (branchNode: StudioCanvasNode) => {
        if (branchNode.type !== 'task' || (branchNode.data as TaskNodeData).type !== 'BRANCH') return;
        for (const row of listBranchRows((branchNode.data as TaskNodeData).parameters)) {
            const startId = String(row.startTaskId ?? '').trim();
            if (startId && !seen.has(startId)) appendChain(startId);
        }
    };

    const appendChain = (startId: string) => {
        let current: string | undefined = startId;
        while (current && !seen.has(current)) {
            seen.add(current);
            ordered.push(current);

            const currentNode = nodes.find((node) => node.id === current && node.type === 'task');
            if (currentNode && (currentNode.data as TaskNodeData).type === 'BRANCH') {
                appendParallelBranchChains(currentNode);
            }

            current = chainEdges.find((edge) => edge.source === current)?.target;
        }
    };

    for (const spineId of spineIds) {
        if (!seen.has(spineId)) {
            seen.add(spineId);
            ordered.push(spineId);
        }

        const branchNode = nodes.find((node) => node.id === spineId && node.type === 'task');
        if (!branchNode || (branchNode.data as TaskNodeData).type !== 'BRANCH') continue;

        appendParallelBranchChains(branchNode);
    }

    for (const node of getTaskNodes(nodes)) {
        if (!seen.has(node.id)) {
            seen.add(node.id);
            ordered.push(node.id);
        }
    }

    return ordered;
}
