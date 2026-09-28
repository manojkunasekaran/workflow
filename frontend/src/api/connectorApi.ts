import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectorAuthType =
    | 'BEARER_TOKEN'
    | 'API_KEY'
    | 'BASIC_AUTH'
    | 'CUSTOM_HEADER'
    | 'OAUTH2'
    | 'NONE';

export type ConnectorFieldType =
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'JSON'
    | 'SELECT'
    | 'TEXTAREA';

export interface FieldOption {
    label: string;
    value: string;
    description?: string;
}

export interface ConnectorInputField {
    key: string;
    label: string;
    description?: string;
    type: ConnectorFieldType;
    required: boolean;
    defaultValue?: unknown;
    options?: FieldOption[];
    placeholder?: string;
    supportsExpression: boolean;
}

export interface CredentialGuideField {
    key: string;
    label: string;
    hint?: string;
    docUrl?: string;
    requiredScopes?: string[];
}

export interface CredentialGuide {
    fields: CredentialGuideField[];
}

export type ConnectorTriggerType = 'POLL' | 'WEBHOOK';

export interface ConnectorTriggerPreset {
    poll?: import('@/types/api').PollConfig;
    webhook?: import('@/types/api').WebhookConfig;
}

export interface ConnectorTrigger {
    triggerId: string;
    displayName: string;
    description?: string;
    triggerType: ConnectorTriggerType;
    inputSchema?: ConnectorInputField[];
    preset?: ConnectorTriggerPreset;
}

export interface ConnectorAction {
    actionId: string;
    displayName: string;
    description?: string;
    method: string;
    path: string;
    pathParams?: string[];
    fixedHeaders?: Record<string, string>;
    fixedBody?: Record<string, unknown>;
    inputSchema: ConnectorInputField[];
    outputDescription?: string;
    outputPaths?: string[];
    maxRetries?: number;
    retryDelayMs?: number;
}

export interface OAuth2Config {
    authorizationUrl: string;
    tokenUrl: string;
    defaultScopes?: string[];
}

export interface ConnectionSetupField {
    key: string;
    label: string;
    placeholder?: string;
    hint?: string;
    docUrl?: string;
    sensitive?: boolean;
}

export interface ConnectionSetup {
    buttonLabel?: string;
    buttonIcon?: string;
    description?: string;
    fields?: ConnectionSetupField[];
}

export interface VerifyAction {
    method: string;
    path: string;
    headers?: Record<string, string>;
}

export interface ConnectorManifest {
    id?: string;
    scope?: 'SYSTEM' | 'TENANT';
    organizationId?: string;
    connectorId: string;
    displayName: string;
    icon: string;
    category: string;
    baseUrl: string;
    authType: ConnectorAuthType;
    authHeaderName?: string;
    authHeaderPrefix?: string;
    oauth2Config?: OAuth2Config;
    credentialGuide?: CredentialGuide;
    connectionSetup?: ConnectionSetup;
    verifyAction?: VerifyAction;
    actions: ConnectorAction[];
    triggers?: ConnectorTrigger[];
    taskType?: string;
    enabled?: boolean;
    systemConnectionConfigured?: boolean;
}

// ─── Test Action Types ───────────────────────────────────────────────────────

export interface ConnectorTestRequest {
    actionId: string;
    credentialId?: string;
    inputs?: Record<string, unknown>;
}

export interface ConnectorTestResult {
    success: boolean;
    statusCode: number;
    durationMs: number;
    response?: unknown;
    error?: string;
}

// ─── API Client ──────────────────────────────────────────────────────────────

export const connectorApi = {
    // Tenant-scoped — lists system + tenant connectors merged, CRUD on TENANT only
    list: async (): Promise<ConnectorManifest[]> =>
        (await axios.get(`${API_BASE_URL}/connectors`)).data,

    create: async (manifest: ConnectorManifest): Promise<ConnectorManifest> =>
        (await axios.post(`${API_BASE_URL}/connectors`, manifest)).data,

    update: async (connectorId: string, manifest: ConnectorManifest): Promise<ConnectorManifest> =>
        (await axios.put(`${API_BASE_URL}/connectors/${connectorId}`, manifest)).data,

    delete: async (connectorId: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/connectors/${connectorId}`);
    },

    /**
     * Execute a live test call for a connector action.
     * ⚠️ Makes a real API call — side effects will happen.
     */
    testAction: async (connectorId: string, request: ConnectorTestRequest): Promise<ConnectorTestResult> =>
        (await axios.post(`${API_BASE_URL}/connectors/${connectorId}/test`, request)).data,

    // Admin — full CRUD on SYSTEM-scoped connectors
    adminList: async (): Promise<ConnectorManifest[]> =>
        (await axios.get(`${API_BASE_URL}/admin/connectors`)).data,

    adminCreate: async (manifest: ConnectorManifest): Promise<ConnectorManifest> =>
        (await axios.post(`${API_BASE_URL}/admin/connectors`, manifest)).data,

    adminUpdate: async (connectorId: string, manifest: ConnectorManifest): Promise<ConnectorManifest> =>
        (await axios.put(`${API_BASE_URL}/admin/connectors/${connectorId}`, manifest)).data,

    adminDelete: async (connectorId: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/admin/connectors/${connectorId}`);
    },
};
