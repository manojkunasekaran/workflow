import axios from 'axios';
import type { WorkflowDefinition } from '@/types/api';

const API_URL = 'http://localhost:8080/rest';

export const workflowApi = {
    getAll: async (): Promise<WorkflowDefinition[]> => {
        const response = await axios.get(`${API_URL}/workflows`);
        return response.data;
    },

    getById: async (id: string): Promise<WorkflowDefinition> => {
        const response = await axios.get(`${API_URL}/workflows/${id}`);
        return response.data;
    },

    create: async (definition: WorkflowDefinition): Promise<WorkflowDefinition> => {
        const response = await axios.post(`${API_URL}/workflows`, definition);
        return response.data;
    },

    update: async (_id: string, definition: WorkflowDefinition): Promise<WorkflowDefinition> => {
        const response = await axios.post(`${API_URL}/workflows`, definition);
        return response.data;
    },

    run: async (id: string): Promise<any> => {
        const response = await axios.post(`${API_URL}/executions`, { workflowId: id });
        return response.data;
    }
};
