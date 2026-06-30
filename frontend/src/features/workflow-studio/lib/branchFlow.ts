import type { Edge, Node } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import {
    ADD_TASK_NODE_ID,
    BRANCH_LAYOUT,
    CHAIN_LAYOUT,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import {
    TASK_NODE_OUTPUT_LAYOUT,
    handleCenterYForOutput,
    studioTaskNodeHeight,
} from '@/features/workflow-studio/constants/taskNodeLayout';
import {
    listRoutingEndpoints,
    terminatesMainSpine,
} from '@/features/workflow-studio/lib/pluginWiringRuntime';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';

function joinContinuationPosition(
    branchPosition: { x: number; y: number },
    branchHeight: number,
): { x: number; y: number } {
    return {
        x: branchPosition.x + BRANCH_LAYOUT.offsetX * 0.55,
        y: branchPosition.y + branchHeight * 0.5 + 72,
    };
}

function joinNextContinuationPosition(joinPosition: { x: number; y: number }): {
    x: number;
    y: number;
} {
    return {
        x: joinPosition.x + CHAIN_LAYOUT.gap * 0.55,
        y: joinPosition.y,
    };
}

function getTaskNodes(nodes: StudioCanvasNode[]): Node<TaskNodeData>[] {
    return nodes.filter((node): node is Node<TaskNodeData> => node.type === 'task');
}

export function taskTypeById(nodes: StudioCanvasNode[]): Map<string, string> {
    return new Map(getTaskNodes(nodes).map((node) => [node.id, node.data.type]));
}

/** Main-line task ids in execution order (stops at routing terminators). */
export function computeMainSpineIds(
    taskIds: string[],
    types: Map<string, string>,
): string[] {
    const spine: string[] = [];
    for (const taskId of taskIds) {
        spine.push(taskId);
        if (terminatesMainSpine(types.get(taskId) ?? '')) break;
    }
    return spine;
}

export function getMainSpineIdsFromEdges(
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
): string[] {
    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));
    const spine: string[] = [];
    let current: string | undefined = WORKFLOW_START_ID;

    while (current) {
        const nextEdge = chainEdges.find(
            (edge) =>
                edge.source === current &&
                !isBranchChainEdgeId(edge.id) &&
                !edge.id.startsWith('route:'),
        );
        const next = nextEdge?.target;
        if (!next || next === ADD_TASK_NODE_ID) break;
        if (!taskIds.has(next)) break;
        spine.push(next);
        current = next;
    }

    return spine;
}

export function shouldShowMainAddTask(spineIds: string[], types: Map<string, string>): boolean {
    const lastId = spineIds[spineIds.length - 1];
    if (!lastId) return true;
    return !terminatesMainSpine(types.get(lastId) ?? '');
}

export function isMainSpineTerminated(spineIds: string[], types: Map<string, string>): boolean {
    const lastId = spineIds[spineIds.length - 1];
    if (!lastId) return false;
    return terminatesMainSpine(types.get(lastId) ?? '');
}

export function isOnMainSpine(taskId: string, spineIds: string[]): boolean {
    return spineIds.includes(taskId);
}

export function getBranchReferencedTaskIds(nodes: StudioCanvasNode[]): Set<string> {
    const refs = new Set<string>();
    for (const node of getTaskNodes(nodes)) {
        for (const endpoint of listRoutingEndpoints(node.data)) {
            if (endpoint.targetTaskId) refs.add(endpoint.targetTaskId);
        }
    }
    return refs;
}

export function branchSlotPosition(
    sourcePosition: { x: number; y: number },
    handleIndex: number,
    handleCount: number,
    nodeHeight: number = TASK_NODE_OUTPUT_LAYOUT.minBaseHeight,
    isRoutingTerminator = false,
): { x: number; y: number } {
    return {
        x: sourcePosition.x + BRANCH_LAYOUT.offsetX,
        y: handleCenterYForOutput(
            sourcePosition.y,
            nodeHeight,
            handleIndex,
            handleCount,
            isRoutingTerminator,
        ),
    };
}

export function relayoutWorkflow(
    nodes: StudioCanvasNode[],
    spineIds: string[],
    showMainAdd: boolean,
    edges: Edge[] = [],
): StudioCanvasNode[] {
    const start = nodes.find((node) => node.id === WORKFLOW_START_ID);
    const addTask = nodes.find((node) => node.id === ADD_TASK_NODE_ID);
    const taskById = new Map(getTaskNodes(nodes).map((node) => [node.id, node]));
    const placed = new Set<string>();
    const positions = new Map<string, { x: number; y: number }>();

    const result: StudioCanvasNode[] = [];
    let x = CHAIN_LAYOUT.startX;

    if (start) {
        result.push({ ...start, position: { x, y: CHAIN_LAYOUT.y } });
        x += CHAIN_LAYOUT.gap;
    }

    for (const taskId of spineIds) {
        const task = taskById.get(taskId);
        if (!task) continue;
        const pos = { x, y: CHAIN_LAYOUT.y };
        result.push({ ...task, position: pos, draggable: true });
        positions.set(taskId, pos);
        placed.add(taskId);
        x += CHAIN_LAYOUT.gap;
    }

    if (showMainAdd && addTask) {
        result.push({ ...addTask, position: { x, y: CHAIN_LAYOUT.y } });
    }

    const queue = [...spineIds];

    while (queue.length > 0) {
        const parentId = queue.shift()!;
        const parentNode = taskById.get(parentId);
        const parentPos = positions.get(parentId);
        if (!parentNode || !parentPos) continue;

        const endpoints = listRoutingEndpoints(parentNode.data);
        const endpointCount = Math.max(endpoints.length, 1);
        const isRouting = terminatesMainSpine(parentNode.data.type);
        const parentHeight = studioTaskNodeHeight(endpointCount, isRouting);

        for (let idx = 0; idx < endpoints.length; idx++) {
            const endpoint = endpoints[idx];
            const childId = endpoint.targetTaskId?.trim();
            if (!childId || placed.has(childId)) continue;
            const child = taskById.get(childId);
            if (!child) continue;
            const pos = branchSlotPosition(
                parentPos,
                idx,
                endpointCount,
                parentHeight,
                isRouting,
            );
            result.push({ ...child, position: pos, draggable: true });
            positions.set(childId, pos);
            placed.add(childId);
            queue.push(childId);
        }

        if (parentNode.data.type === 'JOIN') {
            const nextTaskId = String(parentNode.data.parameters.nextTaskId ?? '').trim();
            if (nextTaskId && !placed.has(nextTaskId)) {
                const nextNode = taskById.get(nextTaskId);
                if (nextNode) {
                    const nextPos = joinNextContinuationPosition(parentPos);
                    result.push({ ...nextNode, position: nextPos, draggable: true });
                    positions.set(nextTaskId, nextPos);
                    placed.add(nextTaskId);
                    queue.push(nextTaskId);
                }
            }
        }

        for (const edge of edges) {
            if (!isBranchChainEdgeId(edge.id) || edge.source !== parentId) continue;
            const childId = edge.target;
            if (!childId || placed.has(childId)) continue;
            const child = taskById.get(childId);
            if (!child) continue;
            const pos = {
                x: parentPos.x + BRANCH_LAYOUT.offsetX,
                y: parentPos.y,
            };
            result.push({ ...child, position: pos, draggable: true });
            positions.set(childId, pos);
            placed.add(childId);
            queue.push(childId);
        }

        if (parentNode.data.type === 'BRANCH') {
            const joinTaskId = String(parentNode.data.parameters.joinTaskId ?? '').trim();
            if (joinTaskId && !placed.has(joinTaskId)) {
                const joinNode = taskById.get(joinTaskId);
                if (joinNode) {
                    const joinPos = joinContinuationPosition(parentPos, parentHeight);
                    result.push({ ...joinNode, position: joinPos, draggable: true });
                    positions.set(joinTaskId, joinPos);
                    placed.add(joinTaskId);
                    queue.push(joinTaskId);
                }
            }
        }
    }

    for (const node of getTaskNodes(nodes)) {
        if (!placed.has(node.id)) {
            result.push({
                ...node,
                position: { x: CHAIN_LAYOUT.startX + CHAIN_LAYOUT.gap * 2, y: CHAIN_LAYOUT.y + 120 },
                draggable: true,
            });
        }
    }

    // Keep the main + stub in graph state even when hidden (e.g. spine ends at Conditional).
    if (addTask && !result.some((node) => node.id === ADD_TASK_NODE_ID)) {
        result.push({ ...addTask, position: addTask.position ?? { x: 0, y: 0 } });
    }

    return result;
}
