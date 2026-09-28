import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export interface SubscribeStateResponse {
    registrationId?: string;
    webhookUrl?: string;
    status?: string;
    hasExternalSubscription?: boolean;
    lastSubscribeAt?: string;
    lastUnsubscribeAt?: string;
    lastInboundAt?: string;
    lastErrorMessage?: string;
    consecutiveFailures?: number;
}

export interface SubscribeTestResult {
    success: boolean;
    durationMs: number;
    statusCode?: number;
    extractedSubscriptionId?: string;
    error?: string;
}

export interface SubscribeLogEntry {
    id: string;
    timestamp?: string;
    durationMs?: number;
    success?: boolean;
    error?: string;
    triggeredExecution?: boolean;
    eventType?: string;
}

export interface SubscribeLogsPage {
    content: SubscribeLogEntry[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const subscribeTriggerApi = {
    getState: async (workflowId: string): Promise<SubscribeStateResponse> => {
        const response = await axios.get<SubscribeStateResponse>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/subscribe/state`,
        );
        return response.data;
    },

    testSubscribe: async (workflowId: string): Promise<SubscribeTestResult> => {
        const response = await axios.post<SubscribeTestResult>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/subscribe/test`,
        );
        return response.data;
    },

    getLogs: async (workflowId: string, page = 0, size = 20): Promise<SubscribeLogsPage> => {
        const response = await axios.get<SubscribeLogsPage>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/subscribe/logs`,
            { params: { page, size, sort: 'timestamp,desc' } },
        );
        return response.data;
    },
};
