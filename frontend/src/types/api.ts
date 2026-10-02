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
    MCP_TOOL: 'MCP_TOOL',
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

export type TriggerType = 'MANUAL' | 'WEBHOOK' | 'SCHEDULE' | 'POLL' | 'MCP';

export type McpResponseMode = 'TASK_OUTPUT' | 'EXECUTION_ID';

export type McpExposureMode = 'GLOBAL' | 'PER_WORKFLOW' | 'BOTH';

export interface McpTriggerConfig {
    toolName?: string;
    description?: string;
    responseMode?: McpResponseMode;
    responseTaskId?: string;
    waitTimeoutSeconds?: number;
    active?: boolean;
}

export type WebhookDeliveryMode = 'PASSIVE' | 'SUBSCRIBE';

export type WebhookVerificationMode = 'NONE' | 'HEADER_SECRET' | 'HMAC_SHA256' | 'CHALLENGE';

export interface WebhookInboundConfig {
    verificationMode?: WebhookVerificationMode;
    headerName?: string;
    secret?: string;
    eventIdPath?: string;
    payloadPath?: string;
    ignoreDuplicates?: boolean;
    challengeQueryParam?: string;
    challengeResponseField?: string;
}

export interface WebhookConfig {
    deliveryMode?: WebhookDeliveryMode;
    path?: string;
    method?: string;
    active?: boolean;
    inbound?: WebhookInboundConfig;
    subscribeHttp?: PollHttpConfig;
    unsubscribeHttp?: PollHttpConfig;
    subscriptionIdPath?: string;
    connectorId?: string;
    connectorTriggerId?: string;
    connectorInputs?: Record<string, string>;
}

export interface ScheduleConfig {
    cronExpression?: string;
    timezone?: string;
    active?: boolean;
}

export type PollScheduleMode = 'FIXED_INTERVAL' | 'CRON';
export type PollEventSemantics = 'NEW_ITEMS' | 'UPDATED' | 'NEW_OR_UPDATED' | 'RESPONSE_CHANGED';
export type PollEpoch = 'NOW' | 'ALL' | 'FROM_DATE';
export type PollRunMode = 'PER_ITEM' | 'BATCH';

export interface PollScheduleConfig {
    mode: PollScheduleMode;
    intervalSeconds?: number;
    cronExpression?: string;
    timezone?: string;
}

export interface PollHttpConfig {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    credentialId?: string;
}

export type UniqueKeyMode = 'FIELD' | 'CONTENT_HASH';

export interface ChangeDetectionConfig {
    itemsPath?: string;
    keyPaths?: string[];
    updateKeyPath?: string;
    hashIgnorePaths?: string[];
    uniqueKeyMode?: UniqueKeyMode;
    contentHashPaths?: string[];
    timestampPath?: string;
    maxItemsPerPoll?: number;
}

export interface PollFilter {
    field?: string;
    operator?: string;
    value?: unknown;
}

export interface PollConfig {
    active?: boolean;
    schedule: PollScheduleConfig;
    semantics: PollEventSemantics;
    epoch: PollEpoch;
    epochDate?: string;
    runMode: PollRunMode;
    http: PollHttpConfig;
    detection?: ChangeDetectionConfig;
    filters?: PollFilter[];
    connectorId?: string;
    connectorTriggerId?: string;
    connectorInputs?: Record<string, string>;
}

export interface TriggerConfig {
    type?: TriggerType;
    webhook?: WebhookConfig;
    schedule?: ScheduleConfig;
    poll?: PollConfig;
    mcp?: McpTriggerConfig;
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

export type ConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN' | 'ERROR';

export type McpTransport = 'STREAMABLE_HTTP' | 'SSE' | 'STDIO';

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
    mcpServerUrl?: string;
    mcpEndpointPath?: string;
    mcpTransport?: McpTransport;
    mcpStdioCommand?: string;
    mcpStdioArgs?: string;
}

export interface McpToolDescriptor {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

export type AgentToolSource = 'TASK' | 'MCP';

export interface AgentTool {
    name: string;
    description?: string;
    targetTaskId?: string;
    inputSchema?: Record<string, unknown>;
    sourceType?: AgentToolSource;
    credentialId?: string;
    remoteToolName?: string;
}
