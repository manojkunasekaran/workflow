import type { Edge, Node } from '@xyflow/react';
import type { TaskType, WorkflowDefinition, WorkflowTask } from '@/types/api';
import {
    ADD_TASK_NODE_ID,
    BRANCH_LAYOUT,
    CHAIN_LAYOUT,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import { MAIN_IN, MAIN_OUT, BRANCH_CHAIN_PREFIX, isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import {
    computeMainSpineIds,
    getMainSpineIdsFromEdges,
    isMainSpineTerminated,
    relayoutWorkflow,
    shouldShowMainAddTask,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { applyGraphConnection, clearTaskWireReferences, resolveWireTargetHandle } from '@/features/workflow-studio/lib/graphRouting';
import { resolveTaskOutputViews } from '@/features/workflow-studio/lib/pluginWiringRuntime';
import {
    findBranchTaskForChainTask,
    resolveBranchIndexForEndTask,
    sanitizeDanglingBranchJoinReferences,
    syncBranchJoinPair,
    writeBranchEndTaskId,
} from '@/features/workflow-studio/lib/joinWiring';
import {
    STUDIO_EDGE_CLASS,
} from '@/features/workflow-studio/edges/studioEdgeTheme';
import { injectParameterType, summarizeValidationErrors, validateTaskParameters } from '@/features/workflow-studio/task-type-schema/utils';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';

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
    return getMainSpineIdsFromEdges(nodes, edges);
}

function relayoutAndRebuild(
    nodes: StudioCanvasNode[],
    spineIds: string[],
    existingEdges: Edge[] = [],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const repaired = repairJoinBranchChainEdges(nodes, existingEdges);
    const sanitized = sanitizeDanglingBranchJoinReferences(repaired.nodes);
    const withAddTask = sanitized.some((node) => node.id === ADD_TASK_NODE_ID)
        ? sanitized
        : [...sanitized, createAddTaskNode({ x: 0, y: 0 })];
    const types = taskTypeById(withAddTask);
    const showMainAdd = shouldShowMainAddTask(spineIds, types);
    const nextNodes = relayoutWorkflow(withAddTask, spineIds, showMainAdd, repaired.edges);
    return { nodes: nextNodes, edges: rebuildChainEdges(spineIds, types, repaired.edges) };
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
    spineIds: string[],
    existingEdges: Edge[] = [],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const repaired = repairJoinBranchChainEdges(nodes, existingEdges);
    const sanitized = sanitizeDanglingBranchJoinReferences(repaired.nodes);
    const withAddTask = sanitized.some((node) => node.id === ADD_TASK_NODE_ID)
        ? sanitized
        : [...sanitized, createAddTaskNode({ x: 0, y: 0 })];
    const types = taskTypeById(withAddTask);
    const positioned = positionAddTaskStub(withAddTask, spineIds);
    return { nodes: positioned, edges: rebuildChainEdges(spineIds, types, repaired.edges) };
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

/** Position for a node wired off a routing output handle (If/Else/branch path). */
function branchOutputPosition(
    anchor: { x: number; y: number },
    handleIndex: number,
): { x: number; y: number } {
    return {
        x: anchor.x + BRANCH_LAYOUT.offsetX,
        y: anchor.y + handleIndex * 120,
    };
}

/** Index of a routing output handle on the source node (0 if unknown). */
function routingHandleIndex(data: TaskNodeData | undefined, handleId: string): number {
    if (!data) return 0;
    const { outputs } = resolveTaskOutputViews(data);
    const index = outputs.findIndex((output) => output.handleId === handleId);
    return index >= 0 ? index : 0;
}

function nodePositionById(
    nodes: StudioCanvasNode[],
    id: string,
): { x: number; y: number } | undefined {
    return nodes.find((node) => node.id === id)?.position;
}

function updateBranchTaskParameters(
    nodes: StudioCanvasNode[],
    branchTaskId: string,
    parameters: Record<string, unknown>,
): StudioCanvasNode[] {
    return nodes.map((node) => {
        if (node.type !== 'task' || node.id !== branchTaskId) return node;
        return { ...node, data: { ...(node.data as TaskNodeData), parameters } };
    });
}

/** Branch-chain edges to JOIN nodes are invalid — convert to endTaskId + split/join link. */
function repairJoinBranchChainEdges(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    let nextNodes = nodes;
    const removeIds = new Set<string>();

    for (const edge of edges) {
        if (!isBranchChainEdgeId(edge.id)) continue;
        const targetNode = getTaskNodes(nodes).find((node) => node.id === edge.target);
        if (!targetNode || targetNode.data.type !== 'JOIN') continue;

        const branchData = findBranchTaskForChainTask(nodes, edge.source, edges);
        if (!branchData) continue;

        const branchIndex = resolveBranchIndexForEndTask(branchData, edge.source, edges);
        if (branchIndex === null) continue;

        nextNodes = updateBranchTaskParameters(
            nextNodes,
            branchData.taskId,
            writeBranchEndTaskId(branchData, branchIndex, edge.source),
        );
        nextNodes = syncBranchJoinPair(nextNodes, branchData.taskId, targetNode.id);
        removeIds.add(edge.id);
    }

    if (removeIds.size === 0) return { nodes, edges };
    return {
        nodes: nextNodes,
        edges: edges.filter((edge) => !removeIds.has(edge.id)),
    };
}

export function definitionToFlow(
    definition: WorkflowDefinition,
    positions: Record<string, { x: number; y: number }> = {},
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const allTaskIds = definition.tasks.map((task) => task.taskId);
    const types = new Map(definition.tasks.map((task) => [task.taskId, task.type]));
    const spineIds = computeMainSpineIds(allTaskIds, types);

    // Prefer explicitly passed positions, then the persisted layout map.
    const storedLayout = definition.layout ?? {};
    const resolvedPositions = { ...storedLayout, ...positions };
    const hasStoredLayout = definition.tasks.some(
        (task) => resolvedPositions[task.taskId] != null,
    );

    const startPosition = resolvedPositions[WORKFLOW_START_ID];

    const taskNodes: Node<TaskNodeData>[] = definition.tasks.map((task, index) => ({
        id: task.taskId,
        type: 'task',
        position: resolvedPositions[task.taskId] ?? {
            x: CHAIN_LAYOUT.startX + CHAIN_LAYOUT.gap * (1 + index),
            y: CHAIN_LAYOUT.y,
        },
        draggable: true,
        data: {
            taskId: task.taskId,
            type: task.type,
            parameters: task.parameters,
        },
    }));

    const baseNodes: StudioCanvasNode[] = [
        createStartNode(startPosition),
        ...taskNodes,
        createAddTaskNode({ x: 0, y: 0 }),
    ];

    // With a persisted layout, keep positions as-is; otherwise auto-layout once.
    return hasStoredLayout
        ? rebuildPreserving(baseNodes, spineIds)
        : relayoutAndRebuild(baseNodes, spineIds);
}

export function flowToDefinition(
    name: string,
    nodes: StudioCanvasNode[],
    _edges: Edge[],
    existing?: WorkflowDefinition,
    workflowId?: string | null,
): WorkflowDefinition {
    const tasks: WorkflowTask[] = getTaskNodes(nodes).map((node) => ({
        taskId: node.data.taskId,
        type: node.data.type as TaskType,
        parameters: injectParameterType(node.data.type, node.data.parameters),
    }));

    const layout: Record<string, { x: number; y: number }> = {};
    const startPosition = nodePositionById(nodes, WORKFLOW_START_ID);
    if (startPosition) {
        layout[WORKFLOW_START_ID] = { x: startPosition.x, y: startPosition.y };
    }
    for (const node of getTaskNodes(nodes)) {
        if (node.position) {
            layout[node.id] = { x: node.position.x, y: node.position.y };
        }
    }

    return {
        ...existing,
        id: workflowId ?? existing?.id,
        name,
        tasks,
        layout,
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
    const existingTasks = getTaskNodes(nodes).filter((node) => node.id !== updated.taskId);

    const sourceNode = nodes.find((node) => node.id === wire.sourceTaskId && node.type === 'task');
    const anchor =
        sourceNode?.position ?? { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };
    const handleIndex = routingHandleIndex(
        sourceNode?.type === 'task' ? (sourceNode.data as TaskNodeData) : undefined,
        wire.sourceHandle,
    );

    const newNode: Node<TaskNodeData> = {
        id: updated.taskId,
        type: 'task',
        draggable: true,
        position: branchOutputPosition(anchor, handleIndex),
        data: updated,
    };

    let baseNodes = [start, ...existingTasks, newNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    const sourceType =
        sourceNode?.type === 'task' ? (sourceNode.data as TaskNodeData).type : '';

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

    return rebuildPreserving(baseNodes, spineIds, edges);
}

/** Continue an off-spine branch chain from a task's main-out handle. */
export function appendBranchChainTask(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    updated: TaskNodeData,
    sourceTaskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
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
    };

    return rebuildPreserving(baseNodes, spineIds, [...edges, branchEdge]);
}

/** Place a Join branches node at the end of a parallel branch path. */
export function appendJoinAtBranchEnd(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    joinDraft: TaskNodeData,
    sourceTaskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } | null {
    const branchData = findBranchTaskForChainTask(nodes, sourceTaskId, edges);
    if (!branchData) return null;

    const branchIndex = resolveBranchIndexForEndTask(branchData, sourceTaskId, edges);
    if (branchIndex === null) return null;

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
            parameters: injectParameterType('JOIN', {
                ...joinDraft.parameters,
                branchTaskId: branchData.taskId,
            }),
        },
    };

    let baseNodes = [start, ...existingTasks, joinNode, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    baseNodes = updateBranchTaskParameters(
        baseNodes,
        branchData.taskId,
        writeBranchEndTaskId(branchData, branchIndex, sourceTaskId),
    );
    baseNodes = syncBranchJoinPair(baseNodes, branchData.taskId, joinDraft.taskId);

    return rebuildPreserving(baseNodes, spineIds, edges);
}

export function removeTaskFromChain(
    nodes: StudioCanvasNode[],
    edges: Edge[],
    taskId: string,
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges).filter((id) => id !== taskId);
    let nextNodes = nodes.filter((node) => node.id !== taskId);
    nextNodes = clearTaskWireReferences(nextNodes, taskId);
    const cleanedEdges = edges.filter(
        (edge) => edge.source !== taskId && edge.target !== taskId,
    );

    const start = nextNodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nextNodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const tasks = getTaskNodes(nextNodes);
    const baseNodes = [start, ...tasks, addTask].filter(
        (node): node is StudioCanvasNode => Boolean(node),
    );

    return rebuildPreserving(baseNodes, spineIds, cleanedEdges);
}

/**
 * Structural sync that PRESERVES node positions. Used after parameter edits,
 * wiring changes, and task placement — never reflows the canvas.
 */
export function syncWorkflowLayout(
    nodes: StudioCanvasNode[],
    edges: Edge[],
): { nodes: StudioCanvasNode[]; edges: Edge[] } {
    const spineIds = getMainSpineIdsFromEdges(nodes, edges);
    return rebuildPreserving(nodes, spineIds, edges);
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
    const basic = validateWorkflowTasks(nodes);
    if (basic) return basic;

    const workflowTasks = getTaskNodes(nodes).map((node) => ({
        taskId: node.data.taskId,
        type: node.data.type,
        parameters: node.data.parameters,
    }));
    const taskOrder = getOrderedTaskIds(nodes, edges);

    for (const node of getTaskNodes(nodes)) {
        const plugin = getTaskTypePlugin(node.data.type);
        if (!plugin) {
            return `Unknown task type on "${node.data.taskId}": ${node.data.type}`;
        }
        const { errors } = validateTaskParameters(plugin, node.data.parameters, {
            workflowTasks,
            taskOrder,
            currentTaskId: node.data.taskId,
            isNewTask: false,
        });
        if (Object.keys(errors).length > 0) {
            const summary = summarizeValidationErrors(errors) ?? 'Invalid configuration';
            return `${node.data.taskId}: ${summary}`;
        }
    }
    return null;
}
