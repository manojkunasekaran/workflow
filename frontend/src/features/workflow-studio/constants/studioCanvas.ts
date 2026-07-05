export const WORKFLOW_START_ID = '__workflow_start__';
export const ADD_TASK_NODE_ID = '__add_task__';

import { N8N_NODE_LAYOUT } from '@/features/workflow-studio/constants/taskNodeLayout';

/** Center-to-center horizontal spacing for n8n icon tiles (label column + margin). */
export const CHAIN_LAYOUT = {
    startX: 80,
    gap: N8N_NODE_LAYOUT.width + 20,
    y: 120,
} as const;

export const BRANCH_LAYOUT = {
    offsetX: N8N_NODE_LAYOUT.width + 36,
    /** Vertical distance from parent icon center to each two-way branch child center. */
    armOffset: 96,
    siblingGap: 24,
} as const;

export function isWorkflowTaskNodeId(id: string): boolean {
    return id !== WORKFLOW_START_ID && id !== ADD_TASK_NODE_ID;
}
