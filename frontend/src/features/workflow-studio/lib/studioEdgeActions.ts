import type { Edge, Node } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import {
    ADD_TASK_NODE_ID,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import {
    BRANCH_CHAIN_PREFIX,
    isBranchChainEdgeId,
    isRouteEdgeId,
    MAIN_IN,
    MAIN_OUT,
} from '@/features/workflow-studio/lib/graphHandles';
import { getMainSpineIdsFromEdges, positionForRoutingWire, realignRoutingChildren } from '@/features/workflow-studio/lib/branchFlow';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isStubEdgeId } from '@/features/workflow-studio/lib/branchAddStubs';
import {
    applyGraphConnection,
    applyRouteEdgeRemoval,
    resolveWireTargetHandle,
    terminatesMainSpine,
    type RouteEdgeData,
} from '@/features/workflow-studio/lib/graphRouting';
import { addJoinInbound, removeJoinInbound } from '@/features/workflow-studio/lib/workflowTopology';
import { relayoutWorkflowGraph } from '@/features/workflow-studio/lib/workflowGraph';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import { normalizeStudioEdge } from '@/features/workflow-studio/edges/edgeFromProps';
import { STUDIO_EDGE_CLASS, STUDIO_SEQUENCE_STROKE, studioEdgeMarkerEnd } from '@/features/workflow-studio/edges/studioEdgeTheme';

export type StudioEdgeActionKind =
    | 'spine'
    | 'spine-to-add'
    | 'branch-chain'
    | 'route'
    | 'join-merge'
    | 'stub'
    | 'none';

export type StudioEdgeData = RouteEdgeData & {
    studioActionKind?: StudioEdgeActionKind;
};

export function classifyStudioEdge(
    edge: Edge,
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
): StudioEdgeActionKind {
    if (isStubEdgeId(edge.id)) return 'stub';

    if (isRouteEdgeId(edge.id)) {
        const routeData = edge.data as RouteEdgeData | undefined;
        if (routeData?.routeKind === 'join') return 'join-merge';
        if (!edge.target || edge.target.startsWith('__')) return 'none';
        return 'route';
    }

    if (isBranchChainEdgeId(edge.id)) return 'branch-chain';

    if (edge.target === ADD_TASK_NODE_ID) return 'spine-to-add';

    const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
    const sourceOnSpine =
        edge.source === WORKFLOW_START_ID ||
        (edge.source !== ADD_TASK_NODE_ID && spineIds.includes(edge.source));
    const targetOnSpine = edge.target ? spineIds.includes(edge.target) : false;

    if (sourceOnSpine && (targetOnSpine || edge.target === ADD_TASK_NODE_ID)) {
        return edge.target === ADD_TASK_NODE_ID ? 'spine-to-add' : 'spine';
    }

    return 'none';
}

export function canInsertOnStudioEdge(kind: StudioEdgeActionKind | undefined): boolean {
    return Boolean(
        kind &&
            kind !== 'stub' &&
            kind !== 'none' &&
            kind !== 'spine-to-add',
    );
}

export function canDeleteStudioEdge(kind: StudioEdgeActionKind | undefined): boolean {
    return (
        kind === 'route' ||
        kind === 'join-merge' ||
        kind === 'branch-chain' ||
        kind === 'spine'
    );
}

function addTaskNode(
    nodes: StudioCanvasNode[],
    draft: TaskNodeData,
    position: { x: number; y: number } = { x: 0, y: 0 },
): StudioCanvasNode[] {
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== draft.taskId);
    const newNode: Node<TaskNodeData> = {
        id: draft.taskId,
        type: 'task',
        draggable: true,
        position,
        data: draft,
    };
    return [start, ...existingTasks, newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );
}

/** Midpoint between two nodes — used to drop an inserted node on an edge. */
function midpointPosition(
    nodes: StudioCanvasNode[],
    sourceId: string,
    targetId: string,
): { x: number; y: number } {
    const source = nodes.find((node) => node.id === sourceId)?.position;
    const target = nodes.find((node) => node.id === targetId)?.position;
    if (source && target) {
        return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
    }
    if (source) return { x: source.x + 140, y: source.y };
    if (target) return { x: target.x - 140, y: target.y };
    return { x: 0, y: 0 };
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

function isMainChainEdge(edge: Edge): boolean {
    return (
        !isBranchChainEdgeId(edge.id) &&
        !isRouteEdgeId(edge.id) &&
        !isStubEdgeId(edge.id) &&
        edge.sourceHandle === MAIN_OUT &&
        edge.targetHandle === MAIN_IN &&
        edge.target !== ADD_TASK_NODE_ID
    );
}

/**
 * After removing one spine link, drop chain edges that will be rebuilt and
 * demote disconnected downstream chains so they stay wired together.
 */
function prepareEdgesAfterSpineRemoval(edges: Edge[], spineIds: string[]): Edge[] {
    const spineSet = new Set(spineIds);
    const isOnSpine = (id: string | undefined): boolean =>
        Boolean(id && (id === WORKFLOW_START_ID || spineSet.has(id)));

    const prepared: Edge[] = [];

    for (const edge of edges) {
        if (isStubEdgeId(edge.id)) continue;
        if (isRouteEdgeId(edge.id) || isBranchChainEdgeId(edge.id)) {
            prepared.push(edge);
            continue;
        }
        if (edge.target === ADD_TASK_NODE_ID || edge.source === WORKFLOW_START_ID) {
            continue;
        }
        if (isMainChainEdge(edge)) {
            if (isOnSpine(edge.source) && isOnSpine(edge.target)) {
                continue;
            }
            prepared.push(branchChainEdge(edge.source, edge.target));
            continue;
        }
        prepared.push(edge);
    }

    return prepared;
}

function insertOnSpineEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const insertAt =
        edge.source === WORKFLOW_START_ID ? 0 : spineIds.indexOf(edge.source) + 1;
    if (insertAt < 0) return null;

    const baseNodes = addTaskNode(nodes, draft, midpointPosition(nodes, edge.source, edge.target ?? ADD_TASK_NODE_ID));
    const nextSpineIds = [...spineIds.slice(0, insertAt), draft.taskId, ...spineIds.slice(insertAt)];
    return relayoutWorkflowGraph(baseNodes, edges, nextSpineIds);
}

function insertOnBranchChainEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const { source, target } = edge;
    if (!source || !target) return null;

    const baseNodes = addTaskNode(nodes, draft, midpointPosition(nodes, source, target));
    const withoutEdge = edges.filter((item) => item.id !== edge.id);
    const nextEdges = [
        ...withoutEdge,
        branchChainEdge(source, draft.taskId),
        branchChainEdge(draft.taskId, target),
    ];

    return relayoutWorkflowGraph(baseNodes, nextEdges);
}

function insertOnRouteEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const { source, sourceHandle, target } = edge;
    if (!source || !sourceHandle || !target) return null;

    const targetNode = nodes.find((node) => node.id === target && node.type === 'task');
    if (!targetNode) return null;

    const sourceNode = nodes.find((node) => node.id === source && node.type === 'task');
    if (!sourceNode) return null;
    const sourceType = (sourceNode.data as TaskNodeData).type;

    const placeAt = terminatesMainSpine(sourceType)
        ? positionForRoutingWire(nodes, source, sourceHandle, draft)
        : midpointPosition(nodes, source, target);

    let baseNodes = addTaskNode(nodes, draft, placeAt);
    const wired = applyGraphConnection(
        {
            source,
            sourceHandle,
            target: draft.taskId,
            targetHandle: resolveWireTargetHandle(sourceType, sourceHandle),
        },
        baseNodes,
        edges,
    );
    if (!wired) return null;
    baseNodes = wired;

    if (terminatesMainSpine(sourceType)) {
        baseNodes = realignRoutingChildren(baseNodes, source);
    }

    const targetType = (targetNode.data as TaskNodeData).type;
    if (targetType === 'JOIN') {
        return relayoutWorkflowGraph(baseNodes, edges);
    }

    const nextEdges = [...edges, branchChainEdge(draft.taskId, target)];
    return relayoutWorkflowGraph(baseNodes, nextEdges);
}

// Inserting on a join-merge edge swaps the wired inbound: remove the edge source, add the new task.
function insertOnJoinMergeEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const { source } = edge;
    if (!source) return null;

    const joinNode = nodes.find((node) => node.id === edge.target && node.type === 'task');
    if (!joinNode || (joinNode.data as TaskNodeData).type !== 'JOIN') return null;

    const baseNodes = addTaskNode(nodes, draft, midpointPosition(nodes, source, edge.target ?? source));
    const nextEdges = [...edges, branchChainEdge(source, draft.taskId)];

    const withInbound = baseNodes.map((node) => {
        if (node.type !== 'task' || node.id !== joinNode.id) return node;
        const joinData = node.data as TaskNodeData;
        // Swap inbound: prior source is replaced by the inserted task in inboundTaskIds.
        const withoutSource = removeJoinInbound(joinData.parameters, source);
        return {
            ...node,
            data: {
                ...joinData,
                parameters: injectParameterType('JOIN', addJoinInbound(withoutSource, draft.taskId)),
            },
        };
    });

    return relayoutWorkflowGraph(withInbound, nextEdges);
}

export function insertTaskOnStudioEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const normalized = normalizeStudioEdge(edge);
    const kind = classifyStudioEdge(normalized, nodes, edges);

    switch (kind) {
        case 'spine':
        case 'spine-to-add':
            return insertOnSpineEdge(normalized, draft, nodes, edges);
        case 'branch-chain':
            return insertOnBranchChainEdge(normalized, draft, nodes, edges);
        case 'route':
            return insertOnRouteEdge(normalized, draft, nodes, edges);
        case 'join-merge':
            return insertOnJoinMergeEdge(normalized, draft, nodes, edges);
        default:
            return null;
    }
}

export function deleteStudioEdge(
    edge: Edge,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const normalized = normalizeStudioEdge(edge);
    const kind = classifyStudioEdge(normalized, nodes, edges);

    if (kind === 'route' || kind === 'join-merge') {
        const nextNodes = applyRouteEdgeRemoval(normalized, nodes, edges);
        if (!nextNodes) return null;
        return relayoutWorkflowGraph(nextNodes, edges);
    }

    if (kind === 'branch-chain') {
        const nextEdges = edges.filter((item) => item.id !== normalized.id);
        return relayoutWorkflowGraph(nodes, nextEdges);
    }

    if (kind === 'spine') {
        const withoutDeleted = edges.filter((item) => item.id !== normalized.id);
        const spineIds = getMainSpineIdsFromEdges(nodes, withoutDeleted);
        const prepared = prepareEdgesAfterSpineRemoval(withoutDeleted, spineIds);
        return relayoutWorkflowGraph(nodes, prepared, spineIds);
    }

    return null;
}
