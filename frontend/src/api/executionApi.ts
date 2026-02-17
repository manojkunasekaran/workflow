import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/rest';

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
    endTime: string;
    executionData?: any;
    errorMessage?: string;
}

export const executionApi = {
    /**
     * Get all workflow executions
     */
    getAll: async (): Promise<WorkflowExecution[]> => {
        const response = await axios.get(`${API_BASE_URL}/executions`);
        return response.data;
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
    }
};
