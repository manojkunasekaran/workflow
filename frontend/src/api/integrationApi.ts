import axios from 'axios';
import { API_BASE_URL } from '@/api/config';
import type {
    Integration,
    CreateIntegrationRequest,
    UpdateIntegrationRequest,
    AssignUseCaseRequest,
    UseCase
} from '@/types/api';
import { workflowApi } from '@/api/workflowApi';

export const integrationApi = {
    listIntegrations: async (): Promise<Integration[]> => {
        const response = await axios.get<Integration[]>(`${API_BASE_URL}/integrations`);
        return response.data ?? [];
    },

    getIntegration: async (id: string): Promise<Integration> => {
        const response = await axios.get<Integration>(`${API_BASE_URL}/integrations/${id}`);
        return response.data;
    },

    createIntegration: async (req: CreateIntegrationRequest): Promise<Integration> => {
        const response = await axios.post<Integration>(`${API_BASE_URL}/integrations`, req);
        return response.data;
    },

    updateIntegration: async (id: string, req: UpdateIntegrationRequest): Promise<Integration> => {
        const response = await axios.put<Integration>(`${API_BASE_URL}/integrations/${id}`, req);
        return response.data;
    },

    deleteIntegration: async (id: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/integrations/${id}`);
    },

    publishIntegration: async (id: string): Promise<void> => {
        await axios.post(`${API_BASE_URL}/integrations/${id}/publish`);
    },

    deprecateIntegration: async (id: string): Promise<void> => {
        await axios.post(`${API_BASE_URL}/integrations/${id}/deprecate`);
    },

    assignUseCase: async (id: string, req: AssignUseCaseRequest): Promise<Integration> => {
        const response = await axios.post<Integration>(`${API_BASE_URL}/integrations/${id}/use-cases`, req);
        return response.data;
    },

    removeUseCase: async (integrationId: string, workflowId: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/integrations/${integrationId}/use-cases/${workflowId}`);
    },

    listUseCases: async (integrationId: string): Promise<UseCase[]> => {
        const workflows = await workflowApi.getAll();
        return workflows
            .filter(w => w.integrationId === integrationId)
            .map(w => ({
                id: w.id as string,
                name: w.name,
                useCaseTitle: w.useCaseTitle,
                useCaseDescription: w.useCaseDescription,
                integrationId: w.integrationId
            }));
    }
};
