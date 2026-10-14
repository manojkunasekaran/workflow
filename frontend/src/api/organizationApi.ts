import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export type Organization = {
  id: string;
  name: string;
};

export const organizationApi = {
  async list(): Promise<Organization[]> {
    const { data } = await axios.get<Organization[]>(`${API_BASE_URL}/admin/organizations`);
    return data;
  },

  async create(name: string): Promise<Organization> {
    const { data } = await axios.post<Organization>(`${API_BASE_URL}/admin/organizations`, {
      name,
    });
    return data;
  },
};
