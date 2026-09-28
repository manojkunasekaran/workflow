import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export interface WebhookStateResponse {
    registrationId?: string;
    webhookUrl?: string;
    status?: string;
    lastInboundAt?: string;
    consecutiveFailures?: number;
}

export interface WebhookLogEntry {
    id: string;
    timestamp?: string;
    durationMs?: number;
    success?: boolean;
    error?: string;
    triggeredExecution?: boolean;
    eventType?: string;
}

export interface WebhookLogsPage {
    content: WebhookLogEntry[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const webhookTriggerApi = {
    getWebhookState: async (workflowId: string): Promise<WebhookStateResponse> => {
        const response = await axios.get<WebhookStateResponse>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/webhook/state`,
        );
        return response.data;
    },

    getLogs: async (workflowId: string, page = 0, size = 20): Promise<WebhookLogsPage> => {
        const response = await axios.get<WebhookLogsPage>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/webhook/logs`,
            { params: { page, size, sort: 'timestamp,desc' } },
        );
        return response.data;
    },
};
