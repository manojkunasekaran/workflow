import type { Edge, Node } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import {
    ADD_TASK_NODE_ID,
    BRANCH_LAYOUT,
    CHAIN_LAYOUT,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import {
    N8N_NODE_LAYOUT,
    handleWorldYFromNodeTop,
    nodeTopForAlignedInput,
    studioIconBoxHeight,
    studioTaskNodeHeight,
} from '@/features/workflow-studio/constants/taskNodeLayout';
import {
    listRoutingEndpoints,
    terminatesMainSpine,
} from '@/features/workflow-studio/lib/pluginWiringRuntime';
import { resolveTaskOutputViews } from '@/features/workflow-studio/lib/graphRouting';
import { isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';

function joinContinuationPosition(
    branchTop: { x: number; y: number },
    branchIconHeight: number,
): { x: number; y: number } {
    return {
        x: branchTop.x + BRANCH_LAYOUT.offsetX * 0.55,
        y: branchTop.y + branchIconHeight + 64,
    };
}

function joinNextContinuationPosition(joinTop: { x: number; y: number }): {
    x: number;
    y: number;
} {
    return {
        x: joinTop.x + CHAIN_LAYOUT.gap * 0.55,
        y: joinTop.y,
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
    const types = taskTypeById(nodes);
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
        if (terminatesMainSpine(types.get(next) ?? '')) break;
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
    sourceTop: { x: number; y: number },
    handleIndex: number,
    handleCount: number,
    iconBoxHeight: number = studioIconBoxHeight(1, false),
    isRoutingTerminator = false,
    maxChildHeight: number = N8N_NODE_LAYOUT.iconSize,
): { x: number; y: number } {
    if (isRoutingTerminator && handleCount > 1) {
        return {
            x: sourceTop.x + BRANCH_LAYOUT.offsetX,
            y: symmetricRoutingChildTop(sourceTop, handleIndex, handleCount, maxChildHeight),
        };
    }

    const handleY = handleWorldYFromNodeTop(
        sourceTop.y,
        iconBoxHeight,
        handleIndex,
        handleCount,
        isRoutingTerminator,
    );
    return {
        x: sourceTop.x + BRANCH_LAYOUT.offsetX,
        y: nodeTopForAlignedInput(handleY, studioIconBoxHeight(1, false)),
    };
}

type OccupiedSlot = { x: number; top: number; bottom: number };

function nudgeIfOverlapping(
    pos: { x: number; y: number },
    nodeHeight: number,
    occupied: OccupiedSlot[],
): { x: number; y: number } {
    let y = pos.y;
    const horizontalPad = CHAIN_LAYOUT.gap * 0.45;

    for (let attempt = 0; attempt < 32; attempt++) {
        const bottom = y + nodeHeight;
        const blocker = occupied.find(
            (slot) =>
                Math.abs(pos.x - slot.x) < horizontalPad &&
                !(bottom + BRANCH_LAYOUT.siblingGap <= slot.top ||
                    y >= slot.bottom + BRANCH_LAYOUT.siblingGap),
        );
        if (!blocker) break;
        y = blocker.bottom + BRANCH_LAYOUT.siblingGap;
    }

    return { x: pos.x, y };
}

function registerOccupied(
    occupied: OccupiedSlot[],
    pos: { x: number; y: number },
    nodeHeight: number,
): void {
    occupied.push({ x: pos.x, top: pos.y, bottom: pos.y + nodeHeight });
}

function routingParentCenterY(parentTop: { x: number; y: number }): number {
    return parentTop.y + N8N_NODE_LAYOUT.iconSize / 2;
}

function childTopFromIconCenterY(iconCenterY: number): number {
    return iconCenterY - N8N_NODE_LAYOUT.iconSize / 2;
}

/** Mirror branches around the parent icon center (If up / Else down, Approved up / Rejected down). */
function symmetricRoutingChildTop(
    parentTop: { x: number; y: number },
    handleIndex: number,
    handleCount: number,
    maxChildHeight: number,
): number {
    const centerY = routingParentCenterY(parentTop);

    if (handleCount <= 1) {
        return childTopFromIconCenterY(centerY);
    }

    if (handleCount === 2) {
        const halfArm = Math.max(
            BRANCH_LAYOUT.armOffset,
            maxChildHeight / 2 + BRANCH_LAYOUT.siblingGap / 2,
        );
        const childCenterY = handleIndex === 0 ? centerY - halfArm : centerY + halfArm;
        return childTopFromIconCenterY(childCenterY);
    }

    const step = Math.max(
        BRANCH_LAYOUT.armOffset,
        maxChildHeight + BRANCH_LAYOUT.siblingGap,
    );
    const totalSpan = (handleCount - 1) * step;
    const childCenterY = centerY - totalSpan / 2 + handleIndex * step;
    return childTopFromIconCenterY(childCenterY);
}

/** Place a branch child without overlapping siblings (tidy-up / relayout). */
export function layoutBranchChildPosition(
    parentTop: { x: number; y: number },
    handleIndex: number,
    handleCount: number,
    parentIconHeight: number,
    isRoutingParent: boolean,
    childData: TaskNodeData,
    siblingTops: number[],
    occupied: OccupiedSlot[] = [],
    maxSiblingHeight?: number,
): { x: number; y: number } {
    const childOutputs = resolveTaskOutputViews(childData).outputs.length;
    const childIsRouting = terminatesMainSpine(childData.type);
    const childTotalHeight = studioTaskNodeHeight(childOutputs, childIsRouting);
    const childIconHeight = studioIconBoxHeight(childOutputs, childIsRouting);

    let childTop: number;

    if (isRoutingParent) {
        const maxChildHeight = Math.max(childTotalHeight, maxSiblingHeight ?? childTotalHeight);
        childTop = symmetricRoutingChildTop(parentTop, handleIndex, handleCount, maxChildHeight);
    } else {
        const handleY = handleWorldYFromNodeTop(
            parentTop.y,
            parentIconHeight,
            handleIndex,
            handleCount,
            isRoutingParent,
        );
        childTop = nodeTopForAlignedInput(handleY, childIconHeight);

        const minSeparation = childTotalHeight + BRANCH_LAYOUT.siblingGap;
        for (const existingTop of siblingTops) {
            if (Math.abs(childTop - existingTop) < minSeparation) {
                childTop = existingTop + minSeparation;
            }
        }
    }

    const nudged = nudgeIfOverlapping(
        { x: parentTop.x + BRANCH_LAYOUT.offsetX, y: childTop },
        childTotalHeight,
        occupied,
    );
    return nudged;
}

/** Re-stack all wired routing children under a parent (Approved / Rejected / If / Else …). */
export function realignRoutingChildren(
    nodes: StudioCanvasNode[],
    parentTaskId: string,
): StudioCanvasNode[] {
    const parentNode = nodes.find((node) => node.id === parentTaskId && node.type === 'task');
    const parentTop = parentNode?.position;
    if (!parentNode || !parentTop) return nodes;

    const parentData = parentNode.data as TaskNodeData;
    if (!terminatesMainSpine(parentData.type)) return nodes;

    const endpoints = listRoutingEndpoints(parentData);
    const endpointCount = Math.max(endpoints.length, 1);
    const parentIconHeight = studioIconBoxHeight(endpointCount, true);
    const siblingTops: number[] = [];
    const updates = new Map<string, { x: number; y: number }>();

    const wiredChildren = endpoints
        .map((endpoint) => {
            const childId = endpoint.targetTaskId?.trim();
            if (!childId) return null;
            const child = nodes.find((node) => node.id === childId && node.type === 'task');
            if (!child) return null;
            return { endpoint, child };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const maxChildHeight = wiredChildren.reduce((max, { child }) => {
        const outputs = resolveTaskOutputViews(child.data as TaskNodeData).outputs.length;
        const isRouting = terminatesMainSpine((child.data as TaskNodeData).type);
        return Math.max(max, studioTaskNodeHeight(outputs, isRouting));
    }, 0);

    wiredChildren.forEach(({ endpoint, child }, idx) => {
        const handleIndex = endpoints.findIndex((e) => e.handleId === endpoint.handleId);
        const pos = layoutBranchChildPosition(
            parentTop,
            handleIndex >= 0 ? handleIndex : idx,
            endpointCount,
            parentIconHeight,
            true,
            child.data as TaskNodeData,
            siblingTops,
            [],
            maxChildHeight,
        );
        siblingTops.push(pos.y);
        updates.set(child.id, pos);
    });

    if (updates.size === 0) return nodes;

    return nodes.map((node) => {
        const pos = updates.get(node.id);
        return pos ? { ...node, position: pos } : node;
    });
}

/** Initial placement for a new task wired from a routing output handle. */
export function positionForRoutingWire(
    nodes: StudioCanvasNode[],
    parentTaskId: string,
    handleId: string,
    childData: TaskNodeData,
): { x: number; y: number } {
    const parentNode = nodes.find((node) => node.id === parentTaskId && node.type === 'task');
    const parentTop = parentNode?.position ?? { x: CHAIN_LAYOUT.startX, y: CHAIN_LAYOUT.y };
    const parentData = parentNode?.data as TaskNodeData | undefined;
    if (!parentData) {
        return { x: parentTop.x + BRANCH_LAYOUT.offsetX, y: parentTop.y };
    }

    const endpoints = listRoutingEndpoints(parentData);
    const endpointCount = Math.max(endpoints.length, 1);
    const handleIndex = endpoints.findIndex((endpoint) => endpoint.handleId === handleId);
    const idx = handleIndex >= 0 ? handleIndex : 0;
    const parentIconHeight = studioIconBoxHeight(endpointCount, true);

    const siblingTops: number[] = [];
    endpoints.forEach((endpoint, i) => {
        if (i === idx) return;
        const targetId = endpoint.targetTaskId?.trim();
        if (!targetId) return;
        const sibling = nodes.find((node) => node.id === targetId);
        if (sibling?.position) siblingTops.push(sibling.position.y);
    });

    const maxSiblingHeight = endpoints.reduce((max, endpoint) => {
        const targetId = endpoint.targetTaskId?.trim();
        if (!targetId) return max;
        const sibling = nodes.find((node) => node.id === targetId);
        if (!sibling || sibling.type !== 'task') return max;
        const outputs = resolveTaskOutputViews(sibling.data as TaskNodeData).outputs.length;
        const isRouting = terminatesMainSpine((sibling.data as TaskNodeData).type);
        return Math.max(max, studioTaskNodeHeight(outputs, isRouting));
    }, studioTaskNodeHeight(resolveTaskOutputViews(childData).outputs.length, terminatesMainSpine(childData.type)));

    return layoutBranchChildPosition(
        parentTop,
        idx,
        endpointCount,
        parentIconHeight,
        true,
        childData,
        siblingTops,
        [],
        maxSiblingHeight,
    );
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
    const occupied: OccupiedSlot[] = [];
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
        registerOccupied(
            occupied,
            pos,
            studioTaskNodeHeight(
                resolveTaskOutputViews(task.data).outputs.length,
                terminatesMainSpine(task.data.type),
            ),
        );
        x += CHAIN_LAYOUT.gap;
    }

    if (showMainAdd && addTask) {
        result.push({ ...addTask, position: { x, y: CHAIN_LAYOUT.y } });
    }

    const queue = [...spineIds];

    while (queue.length > 0) {
        const parentId = queue.shift()!;
        const parentNode = taskById.get(parentId);
        const parentTop = positions.get(parentId);
        if (!parentNode || !parentTop) continue;

        const endpoints = listRoutingEndpoints(parentNode.data);
        const endpointCount = Math.max(endpoints.length, 1);
        const isRouting = terminatesMainSpine(parentNode.data.type);
        const parentIconHeight = studioIconBoxHeight(endpointCount, isRouting);

        const siblingTops: number[] = [];

        const routingChildren = endpoints
            .map((endpoint, idx) => {
                const childId = endpoint.targetTaskId?.trim();
                if (!childId || placed.has(childId)) return null;
                const child = taskById.get(childId);
                if (!child) return null;
                return { endpoint, child, idx };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        const maxRoutingChildHeight = routingChildren.reduce((max, { child }) => {
            const outputs = resolveTaskOutputViews(child.data).outputs.length;
            const isRoutingChild = terminatesMainSpine(child.data.type);
            return Math.max(max, studioTaskNodeHeight(outputs, isRoutingChild));
        }, 0);

        for (const { child, idx } of routingChildren) {
            const childId = child.id;
            const pos = layoutBranchChildPosition(
                parentTop,
                idx,
                endpointCount,
                parentIconHeight,
                isRouting,
                child.data,
                siblingTops,
                occupied,
                maxRoutingChildHeight,
            );
            siblingTops.push(pos.y);
            const childHeight = studioTaskNodeHeight(
                resolveTaskOutputViews(child.data).outputs.length,
                terminatesMainSpine(child.data.type),
            );
            registerOccupied(occupied, pos, childHeight);
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
                    const nextPos = joinNextContinuationPosition(parentTop);
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
            let pos = {
                x: parentTop.x + CHAIN_LAYOUT.gap,
                y: parentTop.y,
            };
            const childHeight = studioTaskNodeHeight(
                resolveTaskOutputViews(child.data).outputs.length,
                terminatesMainSpine(child.data.type),
            );
            pos = nudgeIfOverlapping(pos, childHeight, occupied);
            registerOccupied(occupied, pos, childHeight);
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
                    const joinPos = joinContinuationPosition(parentTop, parentIconHeight);
                    result.push({ ...joinNode, position: joinPos, draggable: true });
                    positions.set(joinTaskId, joinPos);
                    placed.add(joinTaskId);
                    queue.push(joinTaskId);
                }
            }
        }
    }

    let orphanOffset = 0;
    for (const node of getTaskNodes(nodes)) {
        if (!placed.has(node.id)) {
            const outputCount = resolveTaskOutputViews(node.data).outputs.length;
            const isRouting = terminatesMainSpine(node.data.type);
            const nodeHeight = studioTaskNodeHeight(outputCount, isRouting);
            result.push({
                ...node,
                position: {
                    x: CHAIN_LAYOUT.startX + CHAIN_LAYOUT.gap * 2,
                    y: CHAIN_LAYOUT.y + 80 + orphanOffset,
                },
                draggable: true,
            });
            orphanOffset += nodeHeight + BRANCH_LAYOUT.siblingGap;
        }
    }

    if (addTask && !result.some((node) => node.id === ADD_TASK_NODE_ID)) {
        result.push({ ...addTask, position: addTask.position ?? { x: 0, y: 0 } });
    }

    return result;
}
