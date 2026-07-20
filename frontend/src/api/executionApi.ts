import axios from 'axios';
import type { ExecutionType } from '@/types/api';
import { API_BASE_URL } from '@/api/config';

export const executionStreamUrl = (executionId: string) =>
    `${API_BASE_URL}/executions/${executionId}/stream`;

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: string;
    startTime: string;
    endTime?: string;
    taskExecutionSummaries?: Array<{
        taskExecutionId: string;
        taskDefinitionId: string;
        status: string;
    }>;
    taskOutputs?: Record<string, any>;
    triggerInputs?: Record<string, any>;
}

export interface WorkflowTaskExecution {
    id: string;
    workflowExecutionId: string;
    workflowDefinitionId: string;
    taskDefinitionId: string;
    taskType: string;
    status: string;
    startTime: string;
    endTime?: string;
    executionData?: any;
    errorMessage?: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface HumanTaskRespondRequest {
    actionId: string;
    respondedBy: string;
    formData?: Record<string, unknown>;
}

export const executionApi = {
    /**
     * Trigger a workflow execution.
     * POST /executions/{definitionId}?executionType=SYNC|ASYNC
     */
    trigger: async (
        definitionId: string,
        executionType: ExecutionType,
        inputs?: Record<string, unknown>,
    ): Promise<WorkflowExecution> => {
        const response = await axios.post<WorkflowExecution>(
            `${API_BASE_URL}/executions/${definitionId}`,
            inputs,
            {
                params: { executionType },
                validateStatus: (status) => status === 200 || status === 202,
            },
        );
        return response.data;
    },

    /**
     * Get all workflow executions (paginated API — returns content array)
     */
    getAll: async (): Promise<WorkflowExecution[]> => {
        const response = await axios.get<PageResponse<WorkflowExecution>>(`${API_BASE_URL}/executions`);
        return response.data.content ?? [];
    },

    /**
     * Get workflow execution by ID
     */
    getById: async (id: string): Promise<WorkflowExecution> => {
        const response = await axios.get(`${API_BASE_URL}/executions/${id}`);
        return response.data;
    },

    /**
     * Get task executions for a workflow execution
     */
    getTaskExecutions: async (executionId: string): Promise<WorkflowTaskExecution[]> => {
        const response = await axios.get(`${API_BASE_URL}/executions/${executionId}/tasks`);
        return response.data;
    },

    respondToHumanTask: async (
        executionId: string,
        taskExecutionId: string,
        body: HumanTaskRespondRequest,
    ): Promise<WorkflowTaskExecution> => {
        const response = await axios.post<WorkflowTaskExecution>(
            `${API_BASE_URL}/executions/${executionId}/tasks/${taskExecutionId}/respond`,
            body,
        );
        return response.data;
    },
};
