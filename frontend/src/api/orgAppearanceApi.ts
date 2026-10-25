import axios from 'axios';
import { API_BASE_URL } from '@/api/config';
import type { AccentPresetId } from '@/design-system';

export type OrgAppearance = {
  accentPresetId: AccentPresetId;
  logoUrl: string | null;
  lockAccent: boolean;
};

export const orgAppearanceApi = {
  get: async (): Promise<OrgAppearance> => {
    const { data } = await axios.get<OrgAppearance>(`${API_BASE_URL}/settings/org-appearance`);
    return data;
  },
  update: async (payload: Partial<OrgAppearance>): Promise<OrgAppearance> => {
    const { data } = await axios.put<OrgAppearance>(
      `${API_BASE_URL}/settings/org-appearance`,
      payload,
    );
    return data;
  },
};
