import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { getTaskNodes, updateTaskInChain, type StudioCanvasNode } from './workflowGraph';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';

function findTaskData(nodes: StudioCanvasNode[], taskId: string): TaskNodeData | null {
    const node = getTaskNodes(nodes).find((item) => item.id === taskId);
    return node?.data ?? null;
}

/** Keep BRANCH.joinTaskId and JOIN.branchTaskId in sync when saving either task. */
export function applyTaskWithBranchJoinSync(
    nodes: StudioCanvasNode[],
    previousTaskId: string,
    updated: TaskNodeData,
): StudioCanvasNode[] {
    let next = updateTaskInChain(nodes, previousTaskId, updated);

    if (updated.type === 'BRANCH') {
        const joinId = String(updated.parameters.joinTaskId ?? '').trim();
        if (joinId) {
            const joinData = findTaskData(next, joinId);
            if (joinData?.type === 'JOIN') {
                next = updateTaskInChain(next, joinId, {
                    ...joinData,
                    parameters: injectParameterType('JOIN', {
                        ...joinData.parameters,
                        branchTaskId: updated.taskId,
                    }),
                });
            }
        }
    }

    if (updated.type === 'JOIN') {
        const branchId = String(updated.parameters.branchTaskId ?? '').trim();
        if (branchId) {
            const branchData = findTaskData(next, branchId);
            if (branchData?.type === 'BRANCH') {
                next = updateTaskInChain(next, branchId, {
                    ...branchData,
                    parameters: injectParameterType('BRANCH', {
                        ...branchData.parameters,
                        joinTaskId: updated.taskId,
                    }),
                });
            }
        }
    }

    return next;
}
