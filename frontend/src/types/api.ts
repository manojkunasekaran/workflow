export const TaskType = {
    HTTP_TASK: 'HTTP_TASK',
    SCRIPT_TASK: 'SCRIPT_TASK',
    CONDITIONAL: 'CONDITIONAL'
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
    createdAt?: string;
    updatedAt?: string;
}
