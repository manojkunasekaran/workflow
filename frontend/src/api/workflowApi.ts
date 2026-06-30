import axios from 'axios';
import type { WorkflowDefinition } from '@/types/api';
import { API_BASE_URL } from '@/api/config';

export const workflowApi = {
    getAll: async (): Promise<WorkflowDefinition[]> => {
        const response = await axios.get<WorkflowDefinition[]>(`${API_BASE_URL}/workflows`);
        return response.data ?? [];
    },

    getById: async (id: string): Promise<WorkflowDefinition> => {
        const response = await axios.get<WorkflowDefinition>(`${API_BASE_URL}/workflows/${id}`);
        return response.data;
    },

    create: async (definition: WorkflowDefinition): Promise<WorkflowDefinition> => {
        const response = await axios.post<WorkflowDefinition>(`${API_BASE_URL}/workflows`, definition);
        return response.data;
    },

    /** Backend upserts by id via POST /workflows (no separate PUT endpoint). */
    update: async (id: string, definition: WorkflowDefinition): Promise<WorkflowDefinition> => {
        const response = await axios.post<WorkflowDefinition>(`${API_BASE_URL}/workflows`, {
            ...definition,
            id,
        });
        return response.data;
    },

    run: async (id: string): Promise<unknown> => {
        const response = await axios.post(`${API_BASE_URL}/executions/${id}`);
        return response.data;
    },
};
