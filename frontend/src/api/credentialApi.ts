import axios from 'axios';
import type { IntegrationCredential } from '@/types/api';
import { API_BASE_URL } from '@/api/config';

export const credentialApi = {
    getAll: async (): Promise<IntegrationCredential[]> => {
        const response = await axios.get<IntegrationCredential[]>(`${API_BASE_URL}/credentials`);
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
};
