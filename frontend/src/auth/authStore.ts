import { create } from 'zustand';
import { authApi, type AuthMeResponse } from '@/api/authApi';

type AuthState = {
  me: AuthMeResponse | null;
  hydrated: boolean;
  refreshMe: () => Promise<AuthMeResponse>;
  applyMe: (me: AuthMeResponse) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  hydrated: false,

  applyMe: (me) => {
    set({ me, hydrated: true });
  },

  refreshMe: async () => {
    const me = await authApi.me();
    set({ me, hydrated: true });
    return me;
  },

  logout: async () => {
    await authApi.logout();
    set({ me: null, hydrated: true });
  },
}));

export function isSignedIn(me: AuthMeResponse | null): boolean {
  return Boolean(me?.userId);
}

export function showOrganizationPicker(me: AuthMeResponse | null): boolean {
  if (!me?.organizations?.length) return false;
  return me.organizations.length > 1;
}
