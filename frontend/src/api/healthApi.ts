import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export interface HealthResponse {
    status: string;
    components?: Record<string, { status: string }>;
}

export const healthApi = {
    getApiHealth: async (): Promise<HealthResponse> => {
        const response = await axios.get<HealthResponse>(`${API_BASE_URL}/actuator/health`);
        return response.data;
    },
};
