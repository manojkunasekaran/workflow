import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export interface PollTestResult {
    success: boolean;
    durationMs: number;
    itemsFetched: number;
    itemsNew: number;
    itemsUpdated: number;
    itemsSkipped: number;
    newItems?: Array<Record<string, unknown>>;
    skippedItems?: Array<Record<string, unknown>>;
    error?: string;
    warning?: string;
}

export interface PollStateResponse {
    registrationId?: string;
    status?: string;
    lastPollAt?: string;
    lastSuccessAt?: string;
    lastErrorMessage?: string;
    consecutiveFailures?: number;
    seenKeyCount?: number;
    baselineEstablished?: boolean;
    lastResponseHash?: string;
}

export interface PollLogEntry {
    id: string;
    polledAt?: string;
    durationMs?: number;
    itemsFetched?: number;
    itemsNew?: number;
    itemsSkipped?: number;
    itemsUpdated?: number;
    triggeredExecution?: boolean;
    error?: string;
    reprocess?: boolean;
    reprocessedItemKeys?: string[];
}

export interface PollReprocessRequest {
    itemKeys: string[];
}

export interface PollReprocessResult {
    success: boolean;
    itemsMatched: number;
    itemsTriggered: number;
    matchedItems?: Array<Record<string, unknown>>;
    unmatchedKeys?: string[];
    triggeredKeys?: string[];
    error?: string;
}

export interface PollLogsPage {
    content: PollLogEntry[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const pollTriggerApi = {
    testPoll: async (workflowId: string): Promise<PollTestResult> => {
        const response = await axios.post<PollTestResult>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/poll/test`,
        );
        return response.data;
    },

    getPollState: async (workflowId: string): Promise<PollStateResponse> => {
        const response = await axios.get<PollStateResponse>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/poll/state`,
        );
        return response.data;
    },

    getLogs: async (workflowId: string, page = 0, size = 20): Promise<PollLogsPage> => {
        const response = await axios.get<PollLogsPage>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/poll/logs`,
            { params: { page, size, sort: 'polledAt,desc' } },
        );
        return response.data;
    },

    reprocess: async (workflowId: string, itemKeys: string[]): Promise<PollReprocessResult> => {
        const response = await axios.post<PollReprocessResult>(
            `${API_BASE_URL}/workflows/${workflowId}/trigger/poll/reprocess`,
            { itemKeys },
        );
        return response.data;
    },
};
