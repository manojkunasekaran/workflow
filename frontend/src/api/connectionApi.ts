import axios from 'axios';
import type { IntegrationCredential, McpToolDescriptor } from '@/types/api';
import { API_BASE_URL } from '@/api/config';

export const connectionApi = {
    getAll: async (connectorId?: string): Promise<IntegrationCredential[]> => {
        const response = await axios.get<IntegrationCredential[]>(`${API_BASE_URL}/credentials`, {
            params: connectorId ? { connectorId } : {},
        });
        return response.data ?? [];
    },

    getById: async (id: string): Promise<IntegrationCredential> => {
        const response = await axios.get<IntegrationCredential>(`${API_BASE_URL}/credentials/${id}`);
        return response.data;
    },

    create: async (credential: IntegrationCredential): Promise<IntegrationCredential> => {
        const response = await axios.post<IntegrationCredential>(`${API_BASE_URL}/credentials`, credential);
        return response.data;
    },

    update: async (id: string, credential: IntegrationCredential): Promise<IntegrationCredential> => {
        const response = await axios.post<IntegrationCredential>(`${API_BASE_URL}/credentials`, {
            ...credential,
            id,
        });
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/credentials/${id}`);
    },

    verify: async (id: string): Promise<IntegrationCredential> => {
        const response = await axios.post<IntegrationCredential>(`${API_BASE_URL}/credentials/${id}/verify`);
        return response.data;
    },

    verifyMcp: async (id: string): Promise<IntegrationCredential> => {
        const response = await axios.post<IntegrationCredential>(`${API_BASE_URL}/credentials/${id}/mcp/verify`);
        return response.data;
    },

    listMcpTools: async (id: string): Promise<McpToolDescriptor[]> => {
        const response = await axios.get<McpToolDescriptor[]>(`${API_BASE_URL}/credentials/${id}/mcp/tools`);
        return response.data ?? [];
    },
};
