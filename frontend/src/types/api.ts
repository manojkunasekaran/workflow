export const TaskType = {
    HTTP_TASK: 'HTTP_TASK',
    SCRIPT_TASK: 'SCRIPT_TASK',
    CONDITIONAL: 'CONDITIONAL',
    ITERATOR_TASK: 'ITERATOR_TASK',
    HUMAN_TASK: 'HUMAN_TASK',
    BRANCH: 'BRANCH',
    JOIN: 'JOIN',
    WAIT: 'WAIT',
    DATA_TRANSFORM: 'DATA_TRANSFORM',
} as const;

export type TaskType = typeof TaskType[keyof typeof TaskType];

export interface TaskParameters {
    [key: string]: any;
}

export interface WorkflowTask {
    taskId: string;
    type: TaskType;
    parameters: TaskParameters;
}

export type ExecutionType = 'SYNC' | 'ASYNC';

export interface WorkflowDefinition {
    id?: string;
    name: string;
    tasks: WorkflowTask[];
    /** UI-only canvas layout: taskId -> node position. Engine ignores this. */
    layout?: Record<string, NodePosition>;
    createdAt?: string;
    updatedAt?: string;
}

export interface NodePosition {
    x: number;
    y: number;
    /** Friendly step name — UI only; engine ignores this. */
    displayName?: string;
    /**
     * Studio-only Loop Done wire (`""` = explicitly unwired).
     * Mirrors iterator `doneNextTaskId` so routing survives API round-trips.
     */
    studioDoneWire?: string;
    /**
     * Studio-only branch-path successor (off-spine MAIN_OUT → MAIN_IN).
     * Persists nested branch chains across save/load.
     */
    studioChainOut?: string;
}
