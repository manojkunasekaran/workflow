import axios from 'axios';
import { API_BASE_URL } from '@/api/config';
import { parseUserAppearance } from '@/design-system/validateAppearance';
import type { UserAppearance } from '@/design-system/types';

export type { UserAppearance };

export const userAppearanceApi = {
  async get(): Promise<UserAppearance> {
    const { data } = await axios.get(`${API_BASE_URL}/users/me/appearance`);
    return parseUserAppearance(data);
  },

  async patch(partial: Partial<UserAppearance>): Promise<UserAppearance> {
    const { data } = await axios.patch(`${API_BASE_URL}/users/me/appearance`, partial);
    return parseUserAppearance(data);
  },
};
