import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export type Organization = {
  id: string;
  name: string;
  settings?: Record<string, unknown>;
  memberCount?: number;
  workflowCount?: number;
  createdAt?: string;
};

export type UpdateOrganizationRequest = {
  name: string;
  settings?: Record<string, unknown>;
};

export const organizationApi = {
  async list(): Promise<Organization[]> {
    const { data } = await axios.get<Organization[]>(`${API_BASE_URL}/admin/organizations`);
    return data;
  },

  async get(id: string): Promise<Organization> {
    const { data } = await axios.get<Organization>(`${API_BASE_URL}/admin/organizations/${id}`);
    return data;
  },

  async create(name: string): Promise<Organization> {
    const { data } = await axios.post<Organization>(`${API_BASE_URL}/admin/organizations`, {
      name,
    });
    return data;
  },

  async update(id: string, request: UpdateOrganizationRequest): Promise<Organization> {
    const { data } = await axios.put<Organization>(`${API_BASE_URL}/admin/organizations/${id}`, request);
    return data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/admin/organizations/${id}`);
  },
};
