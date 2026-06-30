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
import { getMainSpineIdsFromEdges } from '@/features/workflow-studio/lib/branchFlow';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isStubEdgeId } from '@/features/workflow-studio/lib/branchAddStubs';
import {
    applyGraphConnection,
    applyRouteEdgeRemoval,
    resolveWireTargetHandle,
    type RouteEdgeData,
} from '@/features/workflow-studio/lib/graphRouting';
import {
    findBranchTaskForChainTask,
    readBranchEndTaskId,
    resolveBranchIndexForEndTask,
    writeBranchEndTaskId,
} from '@/features/workflow-studio/lib/joinWiring';
import { relayoutWorkflowGraph } from '@/features/workflow-studio/lib/workflowGraph';
import { STUDIO_EDGE_CLASS } from '@/features/workflow-studio/edges/studioEdgeTheme';

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
    // The add-task stub at the chain end already handles append; edge insert here duplicates the + UI.
    return Boolean(kind && kind !== 'stub' && kind !== 'none' && kind !== 'spine-to-add');
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
    };
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

    let nextNodes = baseNodes;
    const branchData = findBranchTaskForChainTask(baseNodes, source, edges);
    if (branchData) {
        const branchIndex = resolveBranchIndexForEndTask(branchData, source, edges);
        if (branchIndex !== null && readBranchEndTaskId(branchData, branchIndex) === source) {
            nextNodes = nextNodes.map((node) => {
                if (node.type !== 'task' || node.id !== branchData.taskId) return node;
                return {
                    ...node,
                    data: {
                        ...(node.data as TaskNodeData),
                        parameters: writeBranchEndTaskId(
                            node.data as TaskNodeData,
                            branchIndex,
                            draft.taskId,
                        ),
                    },
                };
            });
        }
    }

    return relayoutWorkflowGraph(nextNodes, nextEdges);
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

    let baseNodes = addTaskNode(nodes, draft, midpointPosition(nodes, source, target));
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

    const targetType = (targetNode.data as TaskNodeData).type;
    if (targetType === 'JOIN') {
        return relayoutWorkflowGraph(baseNodes, edges);
    }

    const nextEdges = [...edges, branchChainEdge(draft.taskId, target)];
    return relayoutWorkflowGraph(baseNodes, nextEdges);
}

function insertOnJoinMergeEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const { source } = edge;
    if (!source) return null;

    const branchData = findBranchTaskForChainTask(nodes, source, edges);
    if (!branchData) return null;
    const branchIndex = resolveBranchIndexForEndTask(branchData, source, edges);
    if (branchIndex === null) return null;

    const baseNodes = addTaskNode(nodes, draft, midpointPosition(nodes, source, edge.target ?? source));
    const nextEdges = [...edges, branchChainEdge(source, draft.taskId)];

    const withEnd = baseNodes.map((node) => {
        if (node.type !== 'task' || node.id !== branchData.taskId) return node;
        return {
            ...node,
            data: {
                ...(node.data as TaskNodeData),
                parameters: writeBranchEndTaskId(
                    node.data as TaskNodeData,
                    branchIndex,
                    draft.taskId,
                ),
            },
        };
    });

    return relayoutWorkflowGraph(withEnd, nextEdges);
}

export function insertTaskOnStudioEdge(
    edge: Edge,
    draft: TaskNodeData,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const kind = classifyStudioEdge(edge, nodes, edges);

    switch (kind) {
        case 'spine':
        case 'spine-to-add':
            return insertOnSpineEdge(edge, draft, nodes, edges);
        case 'branch-chain':
            return insertOnBranchChainEdge(edge, draft, nodes, edges);
        case 'route':
            return insertOnRouteEdge(edge, draft, nodes, edges);
        case 'join-merge':
            return insertOnJoinMergeEdge(edge, draft, nodes, edges);
        default:
            return null;
    }
}

export function deleteStudioEdge(
    edge: Edge,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const kind = classifyStudioEdge(edge, nodes, edges);

    if (kind === 'route' || kind === 'join-merge') {
        const nextNodes = applyRouteEdgeRemoval(edge, nodes, edges);
        if (!nextNodes) return null;
        return relayoutWorkflowGraph(nextNodes, edges);
    }

    if (kind === 'branch-chain') {
        const nextEdges = edges.filter((item) => item.id !== edge.id);
        return relayoutWorkflowGraph(nodes, nextEdges);
    }

    if (kind === 'spine') {
        const spineIds = getMainSpineIdsFromEdges(nodes, edges);
        const targetIdx = edge.target ? spineIds.indexOf(edge.target) : -1;
        if (targetIdx < 0) return null;
        const nextSpineIds = spineIds.slice(0, targetIdx);
        return relayoutWorkflowGraph(nodes, edges, nextSpineIds);
    }

    return null;
}
