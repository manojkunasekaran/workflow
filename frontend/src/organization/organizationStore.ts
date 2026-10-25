import { create } from 'zustand';
import { authApi, type AuthMeResponse } from '@/api/authApi';
import { organizationApi, type Organization } from '@/api/organizationApi';
import { useAuthStore } from '@/auth/authStore';

type OrganizationState = {
  organizations: Organization[];
  currentOrganizationId: string | null;
  hydrated: boolean;
  bootstrapError: string | null;
  bootstrap: (providedMe?: AuthMeResponse) => Promise<void>;
  setCurrentOrganizationId: (id: string) => void;
  switchOrganization: (id: string, redirectUrl?: string) => Promise<void>;
  createOrganization: (name: string) => Promise<Organization>;
};

function orgsFromAuth(me: AuthMeResponse): Organization[] {
  return (me.organizations ?? []).map((o) => ({ id: o.id, name: o.name }));
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organizations: [],
  currentOrganizationId: null,
  hydrated: false,
  bootstrapError: null,

  bootstrap: async (providedMe?: AuthMeResponse) => {
    set({ bootstrapError: null });
    try {
      const me = providedMe ?? (await useAuthStore.getState().refreshMe());
      const organizations = orgsFromAuth(me);
      const currentOrganizationId = me.activeOrganizationId ?? organizations[0]?.id ?? null;
      set({ organizations, currentOrganizationId, hydrated: true, bootstrapError: null });
    } catch (err: unknown) {
      console.error('Failed to bootstrap organization state', err);
      const msg = err instanceof Error ? err.message : 'Could not load application session.';
      set({ bootstrapError: msg });
    }
  },

  setCurrentOrganizationId: (id) => {
    void get().switchOrganization(id);
  },

  switchOrganization: async (id, redirectUrl) => {
    const me = await authApi.switchOrganization(id);
    useAuthStore.getState().applyMe(me);
    const organizations = orgsFromAuth(me);
    set({
      organizations,
      currentOrganizationId: me.activeOrganizationId ?? id,
    });
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  },

  createOrganization: async (name) => {
    const created = await organizationApi.create(name);
    const updated = await authApi.switchOrganization(created.id);
    useAuthStore.getState().applyMe(updated);
    set({
      organizations: orgsFromAuth(updated),
      currentOrganizationId: updated.activeOrganizationId ?? created.id,
    });
    return created;
  },
}));
