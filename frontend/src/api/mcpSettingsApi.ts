import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export type McpExposureMode = 'GLOBAL' | 'PER_WORKFLOW' | 'BOTH';

export interface McpSettingsResponse {
    enabled: boolean;
    exposureMode: McpExposureMode;
    globalEndpointPath: string;
    globalEndpointUrl: string;
    authTokenMasked?: string;
    hasAuthToken?: boolean;
    allowStdioTransport?: boolean;
}

export interface McpSettingsUpdateRequest {
    enabled?: boolean;
    exposureMode?: McpExposureMode;
    globalEndpointPath?: string;
    allowStdioTransport?: boolean;
}

/** Backend returns `{ token }` from McpRegenerateTokenResponse. */
export interface McpRegenerateTokenResponse {
    token: string;
}

interface TriggerMcpLogDto {
    timestamp?: string;
    endpoint?: string;
    toolName?: string;
    authSuccess?: boolean;
    success?: boolean;
    executionId?: string;
}

interface TriggerMcpLogPageDto {
    content?: TriggerMcpLogDto[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

function mapAuditLogEntry(row: TriggerMcpLogDto): McpAuditLogEntry {
    return {
        timestamp: row.timestamp,
        endpoint: row.endpoint,
        tool: row.toolName,
        authResult: row.authSuccess === undefined ? undefined : row.authSuccess ? 'OK' : 'FAILED',
        success: row.success,
        executionId: row.executionId,
    };
}

export interface McpAuditLogEntry {
    timestamp?: string;
    endpoint?: string;
    tool?: string;
    authResult?: string;
    success?: boolean;
    executionId?: string;
}

export interface McpAuditLogsPage {
    content: McpAuditLogEntry[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const mcpSettingsApi = {
    get: async (): Promise<McpSettingsResponse> => {
        const response = await axios.get<McpSettingsResponse>(`${API_BASE_URL}/settings/mcp`);
        return response.data;
    },

    update: async (request: McpSettingsUpdateRequest): Promise<McpSettingsResponse> => {
        const response = await axios.put<McpSettingsResponse>(`${API_BASE_URL}/settings/mcp`, request);
        return response.data;
    },

    regenerateToken: async (): Promise<McpRegenerateTokenResponse> => {
        const response = await axios.post<McpRegenerateTokenResponse>(
            `${API_BASE_URL}/settings/mcp/regenerate-token`,
        );
        return response.data;
    },

    getLogs: async (page = 0, size = 20): Promise<McpAuditLogsPage> => {
        const response = await axios.get<TriggerMcpLogPageDto>(`${API_BASE_URL}/settings/mcp/logs`, {
            params: { page, size, sort: 'timestamp,desc' },
        });
        const data = response.data;
        return {
            content: (data.content ?? []).map(mapAuditLogEntry),
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            number: data.number,
            size: data.size,
        };
    },
};
