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
    SMTP_TASK: 'SMTP_TASK',
    CONNECTOR_TASK: 'CONNECTOR_TASK',
    AGENTS_TASK: 'AGENTS_TASK',
    MONGO_TASK: 'MONGO_TASK',
    REDIS_TASK: 'REDIS_TASK',
    NEO4J_TASK: 'NEO4J_TASK',
    DB_TASK: 'DB_TASK',
} as const;

export type TaskType = typeof TaskType[keyof typeof TaskType];

export interface TaskParameters {
    [key: string]: any;
}

export interface WorkflowTask {
    taskId: string;
    type: TaskType;
    parameters: TaskParameters;
    isTool?: boolean;
    nextTaskId?: string;
}

export type ExecutionType = 'SYNC' | 'ASYNC';

export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface WorkflowInput {
    name: string;
    type: VariableType;
    description?: string;
    required?: boolean;
    defaultValue?: any;
}

export interface VariableValue {
    name: string;
    type: VariableType;
    value?: any;
}

export type TriggerType = 'MANUAL' | 'WEBHOOK' | 'SCHEDULE';

export interface WebhookConfig {
    path?: string;
    method?: string;
    active?: boolean;
}

export interface ScheduleConfig {
    cronExpression?: string;
    timezone?: string;
    active?: boolean;
}

export interface TriggerConfig {
    type?: TriggerType;
    webhook?: WebhookConfig;
    schedule?: ScheduleConfig;
}

export interface WorkflowDefinition {
    id?: string;
    name: string;
    tasks: WorkflowTask[];
    trigger?: TriggerConfig;
    inputs?: WorkflowInput[];
    variables?: Record<string, VariableValue>;
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

export type ConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN';

export interface IntegrationCredential {
    id?: string;
    organizationId?: string;
    userId?: string;
    name: string;
    type: string;
    connectorId?: string;
    credentials?: Record<string, string>;
    createdAt?: string;
    updatedAt?: string;
    connectionStatus?: ConnectionStatus;
    connectedAs?: string;
    lastUsedAt?: string;
    credentialScope?: 'PERSONAL' | 'ORG_SHARED' | 'PLATFORM';
}
