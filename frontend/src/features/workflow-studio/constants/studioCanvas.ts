export const WORKFLOW_START_ID = '__workflow_start__';
export const ADD_TASK_NODE_ID = '__add_task__';

export const CHAIN_LAYOUT = {
    startX: 40,
    gap: 280,
    y: 160,
} as const;

export const BRANCH_LAYOUT = {
    offsetX: 260,
} as const;

export function isWorkflowTaskNodeId(id: string): boolean {
    return id !== WORKFLOW_START_ID && id !== ADD_TASK_NODE_ID;
}
