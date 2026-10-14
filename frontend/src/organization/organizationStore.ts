import { create } from 'zustand';
import { authApi } from '@/api/authApi';
import { organizationApi, type Organization } from '@/api/organizationApi';
import { useAuthStore } from '@/auth/authStore';

type OrganizationState = {
  organizations: Organization[];
  currentOrganizationId: string | null;
  hydrated: boolean;
  bootstrap: () => Promise<void>;
  setCurrentOrganizationId: (id: string) => void;
  switchOrganization: (id: string) => Promise<void>;
  createOrganization: (name: string) => Promise<Organization>;
};

function orgsFromAuth(me: Awaited<ReturnType<typeof authApi.me>>): Organization[] {
  return me.organizations.map((o) => ({ id: o.id, name: o.name }));
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organizations: [],
  currentOrganizationId: null,
  hydrated: false,

  bootstrap: async () => {
    const me = await useAuthStore.getState().refreshMe();
    const organizations = orgsFromAuth(me);
    const currentOrganizationId = me.activeOrganizationId ?? organizations[0]?.id ?? null;
    set({ organizations, currentOrganizationId, hydrated: true });
  },

  setCurrentOrganizationId: (id) => {
    void get().switchOrganization(id);
  },

  switchOrganization: async (id) => {
    const me = await authApi.switchOrganization(id);
    useAuthStore.getState().applyMe(me);
    const organizations = orgsFromAuth(me);
    set({
      organizations,
      currentOrganizationId: me.activeOrganizationId ?? id,
    });
    window.location.reload();
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
