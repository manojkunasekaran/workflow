import axios from 'axios';
import '@/api/httpClient';
import { API_BASE_URL } from '@/api/config';

export type AuthMode = 'DEMO' | 'OAUTH';

export type AuthOrganization = {
  id: string;
  name: string;
  role: string | null;
};

export type AuthMeResponse = {
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  pictureUrl?: string | null;
  platformAdmin: boolean;
  signInRequired: boolean;
  authMode?: AuthMode;
  activeOrganizationId?: string | null;
  organizations: AuthOrganization[];
};

export type AuthSignInOptions = {
  mode: AuthMode;
  signInRequired: boolean;
  demoAdminSignInAvailable: boolean;
  demoAdminSignInLabel: string | null;
  demoOrgAdminSignInAvailable?: boolean;
  demoOrgAdminSignInLabel?: string | null;
  demoUserSignInAvailable: boolean;
  demoUserSignInLabel: string | null;
  oauthSignInAvailable: boolean;
  oauthSignInLabel: string | null;
};

export type DemoSignInRole = 'admin' | 'org-admin' | 'user';

export const authApi = {
  async signInOptions(): Promise<AuthSignInOptions> {
    const { data } = await axios.get<AuthSignInOptions>(`${API_BASE_URL}/auth/sign-in-options`, {
      withCredentials: true,
    });
    return data;
  },

  async me(): Promise<AuthMeResponse> {
    try {
      const { data } = await axios.get<AuthMeResponse>(`${API_BASE_URL}/auth/me`, {
        withCredentials: true,
      });
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return {
          platformAdmin: false,
          signInRequired: true,
          organizations: [],
        };
      }
      throw err;
    }
  },

  async signInAsDemo(role: DemoSignInRole): Promise<AuthMeResponse> {
    const { data } = await axios.post<AuthMeResponse>(
      `${API_BASE_URL}/auth/demo/sign-in`,
      { role },
      { withCredentials: true }
    );
    return data;
  },

  async switchOrganization(organizationId: string): Promise<AuthMeResponse> {
    const { data } = await axios.post<AuthMeResponse>(
      `${API_BASE_URL}/auth/session/organization`,
      { organizationId },
      { withCredentials: true }
    );
    return data;
  },

  async logout(): Promise<void> {
    await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
  },

  accountSignInUrl(): string {
    return `${API_BASE_URL}/auth/sign-in`;
  },
};
