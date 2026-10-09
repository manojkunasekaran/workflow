import type { Connection, Edge, Node } from '@xyflow/react';
import type { TaskType, WorkflowDefinition, WorkflowTask } from '@/types/api';
import {
    ADD_TASK_NODE_ID,
    CHAIN_LAYOUT,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import { MAIN_IN, MAIN_OUT, BRANCH_CHAIN_PREFIX, isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import {
    computeMainSpineIds,
    getMainSpineIdsFromEdges,
    isMainSpineTerminated,
    positionForRoutingWire,
    realignRoutingChildren,
    repositionLinkedJoinNodes,
    relayoutWorkflow,
    repairOrphanBranchSplitLayout,
    resolveMainSpineIds,
    shouldShowMainAddTask,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import {
    buildIteratorLoopChainEdges,
    collectAllIteratorLoopBodyTaskIds,
    collectIteratorLoopChainTaskIds,
    expandDefinitionForCanvas,
    stripIteratorCanvasParams,
    syncAllIteratorLoopBodies,
} from '@/features/workflow-studio/lib/iteratorLoopSync';
import {
    applyStudioChainOutToLayout,
    orderTaskIdsForExport,
    restoreBranchChainEdges,
} from '@/features/workflow-studio/lib/branchChainPersistence';
import {
    addJoinInbound,
    buildWorkflowGraphFromCanvas,
    resolveJoinInbounds,
} from '@/features/workflow-studio/lib/workflowTopology';
import { resolveTaskDisplayName } from '@/features/workflow-studio/lib/taskDisplayName';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { applyGraphConnection, clearTaskWireReferences, ensureRoutingListRows, listRoutingEndpoints, resolveWireTargetHandle, terminatesMainSpine } from '@/features/workflow-studio/lib/graphRouting';
import {
    isAllowedBranchChainEdge,
    sanitizeDanglingBranchJoinReferences,
    sanitizeBranchSpineConflicts,
    sanitizeInvalidBranchChainEdges,
    stripLegacyBranchNextTaskId,
} from '@/features/workflow-studio/lib/joinWiring';
import {
    STUDIO_EDGE_CLASS,
    STUDIO_SEQUENCE_STROKE,
    studioEdgeMarkerEnd,
} from '@/features/workflow-studio/edges/studioEdgeTheme';
import { injectParameterType, summarizeValidationErrors, validateTaskParameters } from '@/features/workflow-studio/task-type-schema/utils';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { parseIteratorActions, normalizeIteratorParamsForExport } from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { TASK_PLUGINS } from '@/features/workflow-studio/task-type-schema/plugins';
import {
    applyRoutingDefaults,
    syncRouteParamsFromEdges,
    validateWorkflowGraph,
} from '@/features/workflow-studio/lib/workflowValidation';

const pluginByType = new Map(TASK_PLUGINS.map((plugin) => [plugin.type, plugin]));

function normalizeTaskParametersForExport(
    taskType: TaskType,
    parameters: Record<string, unknown>,
): Record<string, unknown> {
    const plugin = pluginByType.get(taskType);
    let normalized = { ...parameters };
    if (plugin?.normalize) {
        normalized = plugin.normalize(normalized);
    }
    return injectParameterType(taskType, normalized);
}
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { DEFAULT_TASK_WIRING } from '@/features/workflow-studio/task-type-schema/pluginWiringTypes';

export type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
export { getTaskNodes } from '@/features/workflow-studio/lib/canvasNodeUtils';

function preserveBranchChainEdges(edges: Edge[]): Edge[] {
    return edges.filter((edge) => isBranchChainEdgeId(edge.id));
}

export function rebuildChainEdges(
    spineIds: string[],
    types: Map<string, string>,
    existingEdges: Edge[] = [],
): Edge[] {
    const edges: Edge[] = [];
    let previous = WORKFLOW_START_ID;

    for (const taskId of spineIds) {
        edges.push({
            id: `${previous}->${taskId}`,
            source: previous,
            target: taskId,
            sourceHandle: MAIN_OUT,
            targetHandle: MAIN_IN,
            type: 'studioChain',
            className: STUDIO_EDGE_CLASS,
            markerEnd: studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE),
        });
        previous = taskId;
    }

    if (shouldShowMainAddTask(spineIds, types)) {
        edges.push({
            id: `${previous}->${ADD_TASK_NODE_ID}`,
            source: previous,
            target: ADD_TASK_NODE_ID,
            sourceHandle: MAIN_OUT,
            targetHandle: MAIN_IN,
            type: 'studioChain',
            className: STUDIO_EDGE_CLASS,
        });
    }

    return [...edges, ...preserveBranchChainEdges(existingEdges)];
}

export function createStartNode(
    position: { x: number; y: number } = { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y },
): StudioCanvasNode {
    return {
        id: WORKFLOW_START_ID,
        type: 'start',
        position,
        draggable: true,
        selectable: true,
        data: { label: 'When workflow runs' },
    };
}

export function createAddTaskNode(position: { x: number; y: number }): StudioCanvasNode {
    return {
        id: ADD_TASK_NODE_ID,
        type: 'addTask',
        position,
        draggable: true,
        selectable: true,
        data: {},
    };
}

export function getOrderedTaskIds(nodes: StudioCanvasNode[], edges: Edge[]): string[] {
    return resolveMainSpineIds(nodes, edges);
}

function relayoutAndRebuild(
    nodes: StudioCanvasNode[],
    spineIds: string[],
    existingEdges: Edge[] = [],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const filteredEdges = stripJoinBranchChainEdges(nodes, existingEdges);
    const sanitized = sanitizeDanglingBranchJoinReferences(nodes);
    const withAddTask = sanitized.some((node) => node.id === ADD_TASK_NODE_ID)
        ? sanitized
        : [...sanitized, createAddTaskNode({ x: 0, y: 0 })];
    const types = taskTypeById(withAddTask);
    const showMainAdd = shouldShowMainAddTask(spineIds, types);
    const nextNodes = relayoutWorkflow(withAddTask, spineIds, showMainAdd, filteredEdges);
    return { nodes: nextNodes, edges: rebuildChainEdges(spineIds, types, filteredEdges) };
}

/**
 * Structural rebuild that PRESERVES existing node positions (n8n-style).
 * Repairs branch/join references and rebuilds chain edges, but never reflows
 * already-placed nodes. Only the trailing add-task stub is repositioned so the
 * "+" affordance stays at the end of the main chain. New task nodes are expected
 * to already carry a computed position from their placement helper.
 */
function rebuildPreserving(
    nodes: StudioCanvasNode[],
    _spineIds: string[],
    existingEdges: Edge[] = [],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const filteredEdges = stripJoinBranchChainEdges(nodes, existingEdges);
    const sanitized = sanitizeDanglingBranchJoinReferences(nodes);
    const stripped = stripLegacyBranchNextTaskId(sanitized);
    const branchSanitized = sanitizeBranchSpineConflicts(stripped, filteredEdges);
    const layoutNodes = repairOrphanBranchSplitLayout(branchSanitized, filteredEdges);
    const chainEdges = sanitizeInvalidBranchChainEdges(layoutNodes, filteredEdges);
    const resolvedSpine = resolveMainSpineIds(layoutNodes, chainEdges);
    const withAddTask = layoutNodes.some((node) => node.id === ADD_TASK_NODE_ID)
        ? layoutNodes
        : [...layoutNodes, createAddTaskNode({ x: 0, y: 0 })];
    const types = taskTypeById(withAddTask);
    const positioned = positionAddTaskStub(withAddTask, resolvedSpine);
    return { nodes: positioned, edges: rebuildChainEdges(resolvedSpine, types, chainEdges) };
}

/** Keep the trailing add-task node parked one slot past the last main-chain task. */
function positionAddTaskStub(
    nodes: StudioCanvasNode[],
    spineIds: string[],
): StudioCanvasNode[] {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const lastSpineId = spineIds[spineIds.length - 1];
    const anchor =
        (lastSpineId ? byId.get(lastSpineId) : byId.get(WORKFLOW_START_ID))?.position ??
        { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };

    return nodes.map((node) =>
        node.id === ADD_TASK_NODE_ID
            ? { ...node, position: { x: anchor.x + CHAIN_LAYOUT.gap, y: anchor.y } }
            : node,
    );
}

/** Position for a node appended to the end of a chain from an anchor task/start. */
function chainContinuationPosition(anchor: { x: number; y: number }): { x: number; y: number } {
    return { x: anchor.x + CHAIN_LAYOUT.gap, y: anchor.y };
}

/** Position for a node wired off a routing output handle (If / Else / Approved / Rejected …). */
function branchOutputPosition(
    parentTaskId: string,
    handleId: string,
    childData: TaskNodeData,
    nodes: StudioCanvasNode[],
): { x: number; y: number } {
    return positionForRoutingWire(nodes, parentTaskId, handleId, childData);
}

function nodePositionById(
    nodes: StudioCanvasNode[],
    id: string,
): { x: number; y: number } | undefined {
    return nodes.find((node) => node.id === id)?.position;
}

/** Branch-chain edges to JOIN nodes are invalid — drop them (validation rejects on save). */
function stripJoinBranchChainEdges(nodes: StudioCanvasNode[], edges: Edge[]): Edge[] {
    return edges.filter((edge) => {
        if (!isBranchChainEdgeId(edge.id)) return true;
        const targetNode = getTaskNodes(nodes).find((node) => node.id === edge.target);
        return targetNode?.data.type !== 'JOIN';
    });
}

export function definitionToFlow(
    definition: WorkflowDefinition,
    positions: Record<string, { x: number; y: number; displayName?: string }> = {},
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const expanded = expandDefinitionForCanvas(definition);

    const storedLayout = definition.layout ?? {};
    const resolvedPositions = { ...storedLayout, ...positions };
    const hasStoredLayout =
        Object.keys(storedLayout).length > 0 &&
        definition.tasks.every((task) => storedLayout[task.taskId] != null);

    const startPosition = resolvedPositions[WORKFLOW_START_ID];

    const taskNodes: Node<TaskNodeData>[] = expanded.tasks.map((task, index) => ({
        id: task.taskId,
        type: 'task',
        position: resolvedPositions[task.taskId] ?? {
            x: CHAIN_LAYOUT.startX + CHAIN_LAYOUT.gap * (1 + index),
            y: CHAIN_LAYOUT.y,
        },
        draggable: true,
        data: {
            taskId: task.taskId,
            displayName: resolvedPositions[task.taskId]?.displayName,
            type: task.type,
            parameters: task.parameters,
        },
    }));

    const baseNodes: StudioCanvasNode[] = [
        createStartNode(startPosition),
        ...taskNodes,
        createAddTaskNode({ x: 0, y: 0 }),
    ];

    const stripped = stripLegacyBranchNextTaskId(baseNodes);
    const restoredBranchChains = restoreBranchChainEdges(definition);
    const sanitizedNodes = sanitizeBranchSpineConflicts(stripped, restoredBranchChains);
    const spineIds = resolveMainSpineIds(sanitizedNodes, restoredBranchChains);

    const result = hasStoredLayout
        ? rebuildPreserving(sanitizedNodes, spineIds, restoredBranchChains)
        : relayoutAndRebuild(sanitizedNodes, spineIds, restoredBranchChains);

    const loopChainEdges: Edge[] = [];
    for (const task of expanded.tasks) {
        if (task.type !== 'ITERATOR_TASK') continue;
        const chainIds = parseIteratorActions(task.parameters?.actions).map((action) => action.taskId);
        loopChainEdges.push(...buildIteratorLoopChainEdges(chainIds));
    }

    const edgeIds = new Set(result.edges.map((edge) => edge.id));
    const mergedEdges = [
        ...result.edges,
        ...loopChainEdges.filter((edge) => !edgeIds.has(edge.id)),
    ];

    let finalNodes = result.nodes;
    for (const node of getTaskNodes(finalNodes)) {
        if (terminatesMainSpine(node.data.type)) {
            finalNodes = realignRoutingChildren(finalNodes, node.id);
        }
    }

    return { nodes: finalNodes, edges: mergedEdges };
}

export function flowToDefinition(
    name: string,
    nodes: StudioCanvasNode[],
    edges: Edge[],
    existing?: WorkflowDefinition,
    workflowId?: string | null,
): WorkflowDefinition {
    const syncedNodes = syncRouteParamsFromEdges(
        syncAllIteratorLoopBodies(nodes, edges),
        edges,
    );
    const loopBodyIds = collectAllIteratorLoopBodyTaskIds(syncedNodes, edges);
    const topologyGraph = buildWorkflowGraphFromCanvas(syncedNodes, edges);

    const layout: Record<string, { x: number; y: number; displayName?: string }> = {};
    const startPosition = nodePositionById(syncedNodes, WORKFLOW_START_ID);
    if (startPosition) {
        layout[WORKFLOW_START_ID] = { x: startPosition.x, y: startPosition.y };
    }
    for (const node of getTaskNodes(syncedNodes)) {
        if (node.position) {
            const data = node.data as TaskNodeData;
            const entry: {
                x: number;
                y: number;
                displayName?: string;
                studioDoneWire?: string;
            } = {
                x: node.position.x,
                y: node.position.y,
                displayName: data.displayName,
            };
            if (data.type === 'ITERATOR_TASK') {
                entry.studioDoneWire = String(data.parameters.doneNextTaskId ?? '').trim();
            }
            layout[node.id] = entry;
        }
    }

    const layoutWithChains = applyStudioChainOutToLayout(layout, edges);

    const taskPayloadById = new Map<string, WorkflowTask>();
    for (const node of getTaskNodes(syncedNodes)) {
        if (loopBodyIds.has(node.data.taskId)) continue;
        const data = node.data as TaskNodeData;
        const stripped =
            data.type === 'ITERATOR_TASK'
                ? stripIteratorCanvasParams(data.parameters)
                : data.parameters;
        const prepared =
            data.type === 'ITERATOR_TASK'
                ? normalizeIteratorParamsForExport(stripped)
                : stripped;
        let parameters = normalizeTaskParametersForExport(data.type as TaskType, prepared);
        if (data.type === 'JOIN') {
            parameters = normalizeTaskParametersForExport('JOIN', {
                ...parameters,
                inboundTaskIds: resolveJoinInbounds(data.taskId, topologyGraph),
            });
        }
        const isToolTarget = edges.some((e) => (e.sourceHandle === 'tools' || e.sourceHandle?.startsWith('tool-')) && e.target === data.taskId);
        taskPayloadById.set(data.taskId, {
            isTool: isToolTarget ? true : undefined,
            taskId: data.taskId,
            type: data.type as TaskType,
            parameters,
        });
    }

    const orderedIds = orderTaskIdsForExport(syncedNodes, edges);
    const tasks: WorkflowTask[] = applyRoutingDefaults(
        orderedIds
            .map((taskId) => taskPayloadById.get(taskId))
            .filter((task): task is WorkflowTask => Boolean(task)),
        getMainSpineIdsFromEdges(syncedNodes, edges),
    );

    return {
        id: workflowId ?? existing?.id,
        name,
        tasks,
        trigger: existing?.trigger,
        inputs: existing?.inputs,
        variables: existing?.variables,
        layout: layoutWithChains,
        integrationId: existing?.integrationId,
        useCaseTitle: existing?.useCaseTitle,
        useCaseDescription: existing?.useCaseDescription,
        createdAt: existing?.createdAt,
        updatedAt: existing?.updatedAt,
    };
}

export function appendTaskToChain(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const types = taskTypeById(nodes);
    if (isMainSpineTerminated(spineIds, types)) {
        return null;
    }

    const nextSpineIds = [...spineIds, updated.taskId];
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== updated.taskId);

    const lastSpineId = spineIds[spineIds.length - 1];
    const anchor =
        nodePositionById(nodes, lastSpineId ?? WORKFLOW_START_ID) ??
        { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };

    const newNode: Node<TaskNodeData> = {
        id: updated.taskId,
        type: 'task',
        draggable: true,
        position: chainContinuationPosition(anchor),
        data: updated,
    };

    const baseNodes = [start, ...existingTasks, newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    return rebuildPreserving(baseNodes, nextSpineIds, edges);
}

/** Append to the main chain, or to the next free branch handle when the spine ends at Split. */
export function appendTaskToChainOrBranch(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const onSpine = appendTaskToChain(nodes, edges, updated);
    if (onSpine) return onSpine;

    const spineIds = resolveMainSpineIds(nodes, edges);
    const lastId = spineIds[spineIds.length - 1];
    if (!lastId) return null;

    const lastNode = nodes.find((node) => node.id === lastId && node.type === 'task');
    if (!lastNode) return null;
    const lastData = lastNode.data as TaskNodeData;
    if (!terminatesMainSpine(lastData.type)) return null;

    const unwired = listRoutingEndpoints(lastData).find((endpoint) => !endpoint.targetTaskId?.trim());
    if (!unwired) return null;

    return addBranchTask(nodes, edges, updated, {
        sourceTaskId: lastId,
        sourceHandle: unwired.handleId,
    });
}

/** Place a new task at an explicit canvas position without auto-wiring. */
export function placeDetachedTask(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
    position: { x: number; y: number },
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== updated.taskId);

    const newNode: Node<TaskNodeData> = {
        id: updated.taskId,
        type: 'task',
        draggable: true,
        position,
        data: updated,
    };

    const baseNodes = [start, ...existingTasks, newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    return rebuildPreserving(baseNodes, spineIds, edges);
}

/** Wire a new task from a routing output handle (If / Else / branch path). */
export function addBranchTask(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
    wire: { sourceTaskId: string; sourceHandle: string },
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);

    const preparedNodes = ensureRoutingListRows(nodes, wire.sourceTaskId, wire.sourceHandle);
    const sourceNode = preparedNodes.find((node) => node.id === wire.sourceTaskId && node.type === 'task');
    const sourceData =
        sourceNode?.type === 'task' ? (sourceNode.data as TaskNodeData) : undefined;

    const newNode: Node<TaskNodeData> = {
        id: updated.taskId,
        type: 'task',
        draggable: true,
        position: branchOutputPosition(wire.sourceTaskId, wire.sourceHandle, updated, preparedNodes),
        data: updated,
    };

    let baseNodes = [start, ...getTaskNodes(preparedNodes).filter((node) => node.id !== updated.taskId), newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    const sourceType = sourceData?.type ?? '';

    const wired = applyGraphConnection(
        {
            source: wire.sourceTaskId,
            sourceHandle: wire.sourceHandle,
            target: updated.taskId,
            targetHandle: resolveWireTargetHandle(sourceType, wire.sourceHandle),
        },
        baseNodes,
    );
    if (wired) baseNodes = wired;

    baseNodes = realignRoutingChildren(baseNodes, wire.sourceTaskId);

    return rebuildPreserving(baseNodes, spineIds, edges);
}

/** Continue an off-spine branch chain from a task's main-out handle. */
export function appendBranchChainTask(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
    sourceTaskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    if (updated.type === 'JOIN') return null;

    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== updated.taskId);

    const anchor =
        nodePositionById(nodes, sourceTaskId) ?? { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };

    const newNode: Node<TaskNodeData> = {
        id: updated.taskId,
        type: 'task',
        draggable: true,
        position: chainContinuationPosition(anchor),
        data: updated,
    };

    const baseNodes = [start, ...existingTasks, newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    const branchEdge: Edge = {
        id: `${BRANCH_CHAIN_PREFIX}${sourceTaskId}->${updated.taskId}`,
        source: sourceTaskId,
        sourceHandle: MAIN_OUT,
        target: updated.taskId,
        targetHandle: MAIN_IN,
        type: 'studioChain',
        className: STUDIO_EDGE_CLASS,
        markerEnd: studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE),
    };

    if (!isAllowedBranchChainEdge(nodes, [...edges, branchEdge], sourceTaskId, updated.taskId)) {
        return null;
    }

    return rebuildPreserving(baseNodes, spineIds, [...edges, branchEdge]);
}

/** Place a Join branches node at the end of a parallel branch path. */
export function appendJoinAtBranchEnd(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    joinDraft: TaskNodeData,
    sourceTaskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const sourceNode = nodes.find((node) => node.id === sourceTaskId && node.type === 'task');
    if (!sourceNode) return null;

    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== joinDraft.taskId);

    const anchor =
        nodePositionById(nodes, sourceTaskId) ?? { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };

    const joinNode: Node<TaskNodeData> = {
        id: joinDraft.taskId,
        type: 'task',
        draggable: true,
        position: chainContinuationPosition(anchor),
        data: {
            ...joinDraft,
            parameters: injectParameterType('JOIN', addJoinInbound(joinDraft.parameters, sourceTaskId)),
        },
    };

    const baseNodes = [start, ...existingTasks, joinNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    return rebuildPreserving(baseNodes, spineIds, edges);
}

export function removeTaskFromChain(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    taskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const removedNode = nodes.find((node) => node.id === taskId);
    const idsToRemove = new Set<string>([taskId]);
    if (removedNode?.type === 'task' && (removedNode.data as TaskNodeData).type === 'ITERATOR_TASK') {
        for (const loopTaskId of collectIteratorLoopChainTaskIds(taskId, nodes, edges)) {
            idsToRemove.add(loopTaskId);
        }
    }

    const spineIds = getMainSpineIdsFromEdges(nodes, edges).filter((id) => !idsToRemove.has(id));
    let nextNodes = nodes.filter((node) => !idsToRemove.has(node.id));
    for (const id of idsToRemove) {
        nextNodes = clearTaskWireReferences(nextNodes, id);
    }
    const cleanedEdges = edges.filter(
        (edge) => !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target),
    );

    const start = nextNodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nextNodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const tasks = getTaskNodes(nextNodes);
    const baseNodes = [start, ...tasks, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    return rebuildPreserving(baseNodes, spineIds, cleanedEdges);
}

function taskSupportsMainFlowOut(type: string): boolean {
    const wiring = getTaskTypePlugin(type)?.wiring ?? DEFAULT_TASK_WIRING;
    if (wiring.mainFlow === false) return false;
    if (wiring.mainFlowOut === false) return false;
    return true;
}

function taskSupportsMainFlowIn(type: string): boolean {
    const wiring = getTaskTypePlugin(type)?.wiring ?? DEFAULT_TASK_WIRING;
    if (wiring.mainFlow === false) return false;
    if (wiring.mainFlowIn === false) return false;
    return true;
}

/** Branch-chain tasks wired after `startTaskId` — merged back onto spine on reconnect. */
function collectOrphanChainTail(
    startTaskId: string,
    edges: Edge[],
    taskIds: Set<string>,
): string[] {
    const tail: string[] = [];
    let current = startTaskId;
    for (;;) {
        const link = edges.find(
            (edge) =>
                isBranchChainEdgeId(edge.id) &&
                edge.source === current &&
                edge.sourceHandle === MAIN_OUT &&
                edge.targetHandle === MAIN_IN &&
                edge.target &&
                taskIds.has(edge.target),
        );
        if (!link?.target) break;
        tail.push(link.target);
        current = link.target;
    }
    return tail;
}

/** Wire main-out → main-in on the spine or a branch chain (not routing outputs). */
export function applyMainFlowConnection(
    connection: Connection,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle) return null;
    if (sourceHandle !== MAIN_OUT || targetHandle !== MAIN_IN) return null;
    if (source === target || source === WORKFLOW_START_ID || target === WORKFLOW_START_ID) return null;
    if (source === ADD_TASK_NODE_ID || target === ADD_TASK_NODE_ID) return null;

    const sourceNode = nodes.find((node) => node.id === source && node.type === 'task');
    const targetNode = nodes.find((node) => node.id === target && node.type === 'task');
    if (!sourceNode || !targetNode) return null;

    const sourceType = (sourceNode.data as TaskNodeData).type;
    const targetType = (targetNode.data as TaskNodeData).type;
    if (!taskSupportsMainFlowOut(sourceType) || !taskSupportsMainFlowIn(targetType)) {
        return null;
    }

    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    const types = taskTypeById(nodes);

    if (!spineIds.includes(source)) {
        if (!isAllowedBranchChainEdge(nodes, edges, source, target)) return null;

        const alreadyLinked = edges.some(
            (edge) =>
                edge.source === source &&
                edge.target === target &&
                edge.sourceHandle === MAIN_OUT &&
                edge.targetHandle === MAIN_IN,
        );
        if (alreadyLinked) return null;

        const branchEdge: Edge = {
            id: `${BRANCH_CHAIN_PREFIX}${source}->${target}`,
            source,
            sourceHandle: MAIN_OUT,
            target,
            targetHandle: MAIN_IN,
            type: 'studioChain',
            className: STUDIO_EDGE_CLASS,
            markerEnd: studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE),
        };
        return rebuildPreserving(nodes, spineIds, [...edges, branchEdge]);
    }

    if (terminatesMainSpine(sourceType)) return null;

    let nextSpine = spineIds.filter((taskId) => taskId !== target);
    const sourceIdx = nextSpine.indexOf(source);
    if (sourceIdx < 0) return null;

    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));
    const orphanTail = collectOrphanChainTail(target, edges, taskIds);

    nextSpine = [
        ...nextSpine.slice(0, sourceIdx + 1),
        target,
        ...orphanTail,
        ...nextSpine.slice(sourceIdx + 1),
    ];
    nextSpine = computeMainSpineIds(nextSpine, types);

    return relayoutWorkflowGraph(nodes, edges, nextSpine);
}

function collectConnectionRealignParents(
    connection: Connection,
    nodes: StudioCanvasNode[],
): string[] | undefined {
    const parents = new Set<string>();
    const { source, target } = connection;

    if (source) {
        const sourceNode = nodes.find((node) => node.id === source && node.type === 'task');
        const sourceType = (sourceNode?.data as TaskNodeData | undefined)?.type ?? '';
        if (sourceNode && terminatesMainSpine(sourceType)) {
            parents.add(source);
        }
    }

    if (target) {
        const targetNode = nodes.find((node) => node.id === target && node.type === 'task');
        if (targetNode && (targetNode.data as TaskNodeData).type === 'BRANCH') {
            parents.add(target);
        }
    }

    return parents.size > 0 ? [...parents] : undefined;
}

/** Apply a handle drag: main spine/branch chain first, then routing parameter wires. */
export function applyStudioConnection(
    connection: Connection,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const mainFlow = applyMainFlowConnection(connection, nodes, edges);
    if (mainFlow) {
        return syncWorkflowLayout(
            mainFlow.nodes,
            mainFlow.edges,
            collectConnectionRealignParents(connection, mainFlow.nodes),
        );
    }

    const wiredNodes = applyGraphConnection(connection, nodes, edges);
    if (!wiredNodes) return null;
    return syncWorkflowLayout(
        wiredNodes,
        edges,
        collectConnectionRealignParents(connection, wiredNodes),
    );
}

export function isValidStudioConnection(
    connection: Connection,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): boolean {
    return applyStudioConnection(connection, nodes, edges) !== null;
}

/**
 * Structural sync that PRESERVES node positions. Used after parameter edits,
 * wiring changes, and task placement — never reflows the canvas.
 */
export function syncWorkflowLayout(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    realignParents?: string[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const filteredEdges = stripJoinBranchChainEdges(nodes, edges);
    const branchSanitized = sanitizeBranchSpineConflicts(nodes, filteredEdges);
    const spineIds = resolveMainSpineIds(branchSanitized, filteredEdges);
    let nextNodes = branchSanitized;

    if (realignParents && realignParents.length > 0) {
        for (const parentId of realignParents) {
            nextNodes = realignRoutingChildren(nextNodes, parentId);
        }
    } else {
        for (const node of getTaskNodes(branchSanitized)) {
            if (node.data.type === 'BRANCH') {
                nextNodes = realignRoutingChildren(nextNodes, node.id);
            }
        }
    }

    const withJoinLayout = repositionLinkedJoinNodes(nextNodes, filteredEdges);

    return rebuildPreserving(withJoinLayout, spineIds, filteredEdges);
}

/**
 * Structural rebuild used by edge-insert/placement helpers. Preserves the
 * positions of existing nodes; callers position any newly-added node.
 */
export function relayoutWorkflowGraph(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    spineIds?: string[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spine = spineIds ?? getMainSpineIdsFromEdges(nodes, edges);
    return rebuildPreserving(nodes, spine, edges);
}

/**
 * Explicit "Tidy up" — the only path that reflows the entire canvas into the
 * deterministic auto-layout. Triggered by the user, never automatically.
 */
export function tidyUpWorkflowGraph(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    return relayoutAndRebuild(nodes, spineIds, edges);
}

export function updateTaskInChain(
    nodes: StudioCanvasNode[],
    previousTaskId: string,
    updated: TaskNodeData,
): StudioCanvasNode[] {
    return nodes.map((node) => {
        if (node.type !== 'task' || node.id !== previousTaskId) return node;
        return {
            ...node,
            id: updated.taskId,
            data: updated,
        };
    });
}

export function nextTaskId(existingIds: Set<string>, base: string): string {
    if (!existingIds.has(base)) return base;
    let index = 2;
    while (existingIds.has(`${base}_${index}`)) index += 1;
    return `${base}_${index}`;
}

export function validateWorkflowTasks(nodes: StudioCanvasNode[]): string | null {
    const tasks = getTaskNodes(nodes);
    if (tasks.length === 0) {
        return 'Add at least one task before saving or running.';
    }
    const ids = tasks.map((node) => node.data.taskId);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
        return 'Duplicate task IDs detected. Please reload the workflow.';
    }
    return null;
}

export function findFirstTaskValidationError(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): string | null {
    const syncedNodes = syncRouteParamsFromEdges(
        syncAllIteratorLoopBodies(nodes, edges),
        edges,
    );
    const basic = validateWorkflowTasks(syncedNodes);
    if (basic) return basic;

    const graphError = validateWorkflowGraph(syncedNodes, edges);
    if (graphError) return graphError;

    const workflowTasks = getTaskNodes(syncedNodes).map((node) => ({
        taskId: node.data.taskId,
        type: node.data.type,
        displayName: (node.data as TaskNodeData).displayName,
        parameters: node.data.parameters,
    }));
    const taskOrder = getOrderedTaskIds(syncedNodes, edges);

    for (const node of getTaskNodes(syncedNodes)) {
        const data = node.data as TaskNodeData;
        const label = resolveTaskDisplayName(data);
        const plugin = getTaskTypePlugin(data.type);
        if (!plugin) {
            return `Unknown task type on "${label}"`;
        }
        const { errors } = validateTaskParameters(plugin, data.parameters, {
            workflowTasks,
            taskOrder,
            currentTaskId: data.taskId,
            isNewTask: false,
        });
        if (Object.keys(errors).length > 0) {
            const summary = summarizeValidationErrors(errors) ?? 'Invalid configuration';
            return `${label}: ${summary}`;
        }
    }
    return null;
}

