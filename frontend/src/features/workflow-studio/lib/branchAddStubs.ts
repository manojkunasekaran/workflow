import type { Edge } from '@xyflow/react';
import {
    getMainSpineIdsFromEdges,
    shouldShowMainAddTask,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { isTaskBranchEnd } from '@/features/workflow-studio/lib/joinWiring';
import { MAIN_OUT, isBranchChainEdgeId, isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
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
): boolean {
    if (output.handleId === MAIN_OUT) {
        // Spine main-out is handled separately (end-of-chain append). Here we
        // only surface off-spine main-out tails that can still grow.
        if (onMainSpine || hasBranchChainOut) return false;
        if (isTaskBranchEnd(nodes, taskId, chainEdges)) return false;
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
            if (shouldShowInlineAdd(output, onMainSpine, hasChainOut, node.id, nodes, chainEdges)) {
                keys.add(inlineAddKey(node.id, output.handleId));
            }
        }
    }

    // Main-chain end "+": on the last spine task's main-out when the chain can grow.
    const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
    const lastSpineId = spineIds[spineIds.length - 1];
    if (lastSpineId && shouldShowMainAddTask(spineIds, taskTypeById(nodes))) {
        keys.add(inlineAddKey(lastSpineId, MAIN_OUT));
    }

    return keys;
}

/** Whether the Start node's main-out should show an inline "+" (empty workflow). */
export function shouldShowStartAdd(nodes: StudioCanvasNode[], chainEdges: Edge[]): boolean {
    const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
    return spineIds.length === 0 && shouldShowMainAddTask(spineIds, taskTypeById(nodes));
}
