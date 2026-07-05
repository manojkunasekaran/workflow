import type { Edge } from '@xyflow/react';
import {
    getMainSpineIdsFromEdges,
    shouldShowMainAddTask,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isTaskBranchEnd } from '@/features/workflow-studio/lib/joinWiring';
import { MAIN_OUT, isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import { ADD_TASK_NODE_ID } from '@/features/workflow-studio/constants/studioCanvas';
import { resolveTaskOutputViews } from '@/features/workflow-studio/lib/graphRouting';

/** Legacy stub-edge id prefix — kept so any stale edges are filtered defensively. */
export const STUB_EDGE_PREFIX = 'stub:';

export function isStubEdgeId(id: string): boolean {
    return id.startsWith(STUB_EDGE_PREFIX);
}

export function inlineAddKey(taskId: string, handleId: string): string {
    return `${taskId}::${handleId}`;
}

/** Whether a given output handle should render an inline "+" add affordance. */
function shouldShowInlineAdd(
    output: { handleId: string; wired: boolean; stubBehavior: string },
    onMainSpine: boolean,
    hasBranchChainOut: boolean,
    taskId: string,
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
    outputCount: number,
): boolean {
    if (output.handleId === MAIN_OUT) {
        if (onMainSpine || hasBranchChainOut) return false;
        if (isTaskBranchEnd(nodes, taskId, chainEdges)) return false;
        // Prefer dedicated branch/loop handles over a dangling flow-out stub.
        if (outputCount > 1) return false;
        return true;
    }
    return !output.wired && output.stubBehavior === 'add-task';
}

/**
 * Set of `taskId::handleId` keys whose output handle should render an inline "+".
 * Replaces the standalone add-task / branch-add placeholder nodes (n8n-style).
 */
export function resolveInlineAddHandles(
    nodes: StudioCanvasNode[],
    chainEdges: Edge[],
): Set<string> {
    const spineSet = new Set(getMainSpineIdsFromEdges(nodes, chainEdges));
    const branchChainOut = new Set(
        chainEdges.filter((edge) => isBranchChainEdgeId(edge.id)).map((edge) => edge.source),
    );
    const keys = new Set<string>();

    for (const node of getTaskNodes(nodes)) {
        const { outputs } = resolveTaskOutputViews(node.data);
        const onMainSpine = spineSet.has(node.id);
        const hasChainOut = branchChainOut.has(node.id);

        for (const output of outputs) {
            if (
                shouldShowInlineAdd(
                    output,
                    onMainSpine,
                    hasChainOut,
                    node.id,
                    nodes,
                    chainEdges,
                    outputs.length,
                )
            ) {
                keys.add(inlineAddKey(node.id, output.handleId));
            }
        }
    }

    // Main-chain end "+": only when the last spine task has no outgoing main connection.
    const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
    const lastSpineId = spineIds[spineIds.length - 1];
    if (lastSpineId && shouldShowMainAddTask(spineIds, taskTypeById(nodes))) {
        const hasOutgoingMain = chainEdges.some(
            (edge) =>
                edge.source === lastSpineId &&
                edge.sourceHandle === MAIN_OUT &&
                edge.target &&
                edge.target !== ADD_TASK_NODE_ID,
        );
        if (!hasOutgoingMain) {
            keys.add(inlineAddKey(lastSpineId, MAIN_OUT));
        }
    }

    return keys;
}

/** Whether the Start node's main-out should show an inline "+" (empty workflow). */
export function shouldShowStartAdd(nodes: StudioCanvasNode[], chainEdges: Edge[]): boolean {
    const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
    return spineIds.length === 0 && shouldShowMainAddTask(spineIds, taskTypeById(nodes));
}
