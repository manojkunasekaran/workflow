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
}
