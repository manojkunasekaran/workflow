import type { Edge } from '@xyflow/react';
import type { WorkflowDefinition, WorkflowTask } from '@/types/api';
import { BRANCH_LAYOUT } from '@/features/workflow-studio/constants/studioCanvas';
import { migrateHumanTasksForCanvas } from '@/features/workflow-studio/task-type-schema/humanTask';
import {
    migrateIteratorTasksForCanvas,
    restoreIteratorDoneFromLayout,
} from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { ITER_LOOP_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import {
    ITERATOR_NESTED_TYPES,
    normalizeIteratorActionsForApi,
    parseIteratorActions,
    type IteratorActionRow,
} from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { STUDIO_EDGE_CLASS, STUDIO_SEQUENCE_STROKE, studioEdgeMarkerEnd } from '@/features/workflow-studio/edges/studioEdgeTheme';
import { MAIN_IN, MAIN_OUT, BRANCH_CHAIN_PREFIX } from '@/features/workflow-studio/lib/graphHandles';

/** Canvas-only wiring param — stripped before API export. */
export const ITERATOR_LOOP_BODY_START_PARAM = 'loopBodyStartTaskId';

/** Next task after all iterations complete — persisted to API. */
export const ITERATOR_DONE_NEXT_PARAM = 'doneNextTaskId';

function iteratorNode(nodes: StudioCanvasNode[], iteratorId: string): TaskNodeData | null {
    const node = getTaskNodes(nodes).find((item) => item.id === iteratorId);
    if (!node || node.data.type !== 'ITERATOR_TASK') return null;
    return node.data;
}

export function readIteratorLoopStartId(data: TaskNodeData): string {
    return String(data.parameters[ITERATOR_LOOP_BODY_START_PARAM] ?? '').trim();
}

export function collectIteratorLoopChainTaskIds(
    iteratorId: string,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): string[] {
    const data = iteratorNode(nodes, iteratorId);
    if (!data) return [];

    const startId = readIteratorLoopStartId(data);
    if (!startId) return [];

    const chain: string[] = [startId];
    let current = startId;
    const visited = new Set<string>([startId]);

    while (current) {
        const nextEdge = edges.find(
            (edge) => isBranchChainEdgeId(edge.id) && edge.source === current,
        );
        const next = nextEdge?.target;
        if (!next || visited.has(next)) break;
        chain.push(next);
        visited.add(next);
        current = next;
    }

    return chain;
}

export function collectAllIteratorLoopBodyTaskIds(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): Set<string> {
    const ids = new Set<string>();
    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'ITERATOR_TASK') continue;
        for (const taskId of collectIteratorLoopChainTaskIds(node.id, nodes, edges)) {
            ids.add(taskId);
        }
    }
    return ids;
}

function actionFromNode(node: StudioCanvasNode): IteratorActionRow | null {
    if (node.type !== 'task') return null;
    const data = node.data as TaskNodeData;
    if (!ITERATOR_NESTED_TYPES.includes(data.type as (typeof ITERATOR_NESTED_TYPES)[number])) {
        return null;
    }
    return {
        taskId: data.taskId,
        type: data.type as IteratorActionRow['type'],
        parameters: { ...data.parameters },
    };
}

export function syncIteratorNodeFromCanvas(
    data: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): TaskNodeData {
    const chainIds = collectIteratorLoopChainTaskIds(data.taskId, nodes, edges);
    const byId = new Map(getTaskNodes(nodes).map((node) => [node.id, node]));
    const actions: IteratorActionRow[] = [];

    for (const taskId of chainIds) {
        const node = byId.get(taskId);
        if (!node) continue;
        const action = actionFromNode(node);
        if (action) actions.push(action);
    }

    const loopStart = chainIds[0] ?? '';
    return {
        ...data,
        parameters: injectParameterType('ITERATOR_TASK', {
            ...data.parameters,
            [ITERATOR_LOOP_BODY_START_PARAM]: loopStart || null,
            actions: actions.length > 0 ? normalizeIteratorActionsForApi(actions) : [],
        }),
    };
}

export function syncAllIteratorLoopBodies(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): StudioCanvasNode[] {
    return nodes.map((node) => {
        if (node.type !== 'task' || (node.data as TaskNodeData).type !== 'ITERATOR_TASK') return node;
        return {
            ...node,
            data: syncIteratorNodeFromCanvas(node.data as TaskNodeData, nodes, edges),
        };
    });
}

export function stripIteratorCanvasParams(parameters: Record<string, unknown>): Record<string, unknown> {
    const next = { ...parameters };
    delete next[ITERATOR_LOOP_BODY_START_PARAM];
    return next;
}

function branchChainEdge(source: string, target: string): Edge {
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

export function buildIteratorLoopChainEdges(chainTaskIds: string[]): Edge[] {
    if (chainTaskIds.length === 0) return [];
    const edges: Edge[] = [];
    for (let i = 0; i < chainTaskIds.length - 1; i++) {
        edges.push(branchChainEdge(chainTaskIds[i], chainTaskIds[i + 1]));
    }
    return edges;
}

/** Expand embedded iterator actions into canvas tasks when loading a saved workflow. */
export function expandDefinitionForCanvas(definition: WorkflowDefinition): WorkflowDefinition {
    const withHumanRoutes = migrateHumanTasksForCanvas(definition);
    const withDoneRestored = restoreIteratorDoneFromLayout(withHumanRoutes);
    const withLoopRoutes = migrateIteratorTasksForCanvas(withDoneRestored);
    const topLevelIds = new Set(withLoopRoutes.tasks.map((task) => task.taskId));
    const extraTasks: WorkflowTask[] = [];
    const layout = { ...(withLoopRoutes.layout ?? {}) };
    const hasPersistedLayout = Object.keys(withLoopRoutes.layout ?? {}).length > 0;

    for (const task of withLoopRoutes.tasks) {
        if (task.type !== 'ITERATOR_TASK') continue;
        const actions = parseIteratorActions(task.parameters?.actions);
        if (actions.length === 0) continue;

        const iteratorPos = layout[task.taskId];
        let chainIndex = 0;

        actions.forEach((action) => {
            if (topLevelIds.has(action.taskId)) {
                chainIndex += 1;
                return;
            }

            extraTasks.push({
                taskId: action.taskId,
                type: action.type,
                parameters: injectParameterType(action.type, action.parameters),
            });

            // Only restore loop-body coordinates when the workflow already has a saved layout.
            if (hasPersistedLayout && iteratorPos) {
                layout[action.taskId] = layout[action.taskId] ?? {
                    x: iteratorPos.x + BRANCH_LAYOUT.offsetX + chainIndex * 200,
                    y: iteratorPos.y + chainIndex * 24,
                };
            }

            topLevelIds.add(action.taskId);
            chainIndex += 1;
        });

        const loopStart = actions[0]?.taskId ?? '';
        if (loopStart) {
            task.parameters = injectParameterType('ITERATOR_TASK', {
                ...task.parameters,
                [ITERATOR_LOOP_BODY_START_PARAM]: loopStart,
            });
        }
    }

    if (extraTasks.length === 0) return withLoopRoutes;

    return {
        ...withLoopRoutes,
        tasks: [...withLoopRoutes.tasks, ...extraTasks],
        layout: hasPersistedLayout ? layout : withLoopRoutes.layout,
    };
}

export function collectIteratorLoopChainEdges(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): Edge[] {
    const chainEdges: Edge[] = [];
    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'ITERATOR_TASK') continue;
        const chainIds = collectIteratorLoopChainTaskIds(node.id, nodes, edges);
        chainEdges.push(...buildIteratorLoopChainEdges(chainIds));
    }
    return chainEdges;
}

export function isIteratorLoopHandle(handleId: string): boolean {
    return handleId === ITER_LOOP_OUT;
}
