import axios from 'axios';
import { API_BASE_URL } from '@/api/config';
import type {
    Integration,
    IntegrationInsights,
    IntegrationInsightsRetryResponse,
    UseCaseInsightsDetail,
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

    getInsights: async (id: string): Promise<IntegrationInsights> => {
        const response = await axios.get<IntegrationInsights>(`${API_BASE_URL}/integrations/${id}/insights`);
        return response.data;
    },

    getUseCaseInsights: async (
        integrationId: string,
        workflowDefinitionId: string,
    ): Promise<UseCaseInsightsDetail> => {
        const response = await axios.get<UseCaseInsightsDetail>(
            `${API_BASE_URL}/integrations/${integrationId}/use-cases/${workflowDefinitionId}/insights`,
        );
        return response.data;
    },

    exportInsightsCsv: async (integrationId: string): Promise<{ blob: Blob; filename: string }> => {
        const response = await axios.get(`${API_BASE_URL}/integrations/${integrationId}/insights/export`, {
            responseType: 'blob',
        });
        const disposition = response.headers['content-disposition'] as string | undefined;
        const fromHeader = disposition?.match(/filename="([^"]+)"/i)?.[1];
        const filename = fromHeader ?? `integration-insights-${integrationId}.csv`;
        return { blob: response.data as Blob, filename };
    },

    exportUseCaseInsightsCsv: async (
        integrationId: string,
        workflowDefinitionId: string,
    ): Promise<{ blob: Blob; filename: string }> => {
        const response = await axios.get(
            `${API_BASE_URL}/integrations/${integrationId}/use-cases/${workflowDefinitionId}/insights/export`,
            { responseType: 'blob' },
        );
        const disposition = response.headers['content-disposition'] as string | undefined;
        const fromHeader = disposition?.match(/filename="([^"]+)"/i)?.[1];
        const filename = fromHeader ?? `use-case-insights-${workflowDefinitionId}.csv`;
        return { blob: response.data as Blob, filename };
    },

    retryFailedExecutions: async (
        integrationId: string,
        workflowDefinitionId?: string,
    ): Promise<IntegrationInsightsRetryResponse> => {
        const params = workflowDefinitionId ? { workflowDefinitionId } : undefined;
        const response = await axios.post<IntegrationInsightsRetryResponse>(
            `${API_BASE_URL}/integrations/${integrationId}/insights/retry-failed`,
            null,
            { params },
        );
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
