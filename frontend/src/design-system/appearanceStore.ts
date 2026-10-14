import { create } from 'zustand';
import { userAppearanceApi } from '@/api/userAppearanceApi';
import { applyAppearance } from './applyAppearance';
import { applyThemeModeToDocument } from './applyThemeMode';
import {
  mergeWithOrgPolicy,
  toAppearancePreferences,
  type OrgAppearancePolicy,
} from './mergeOrgAppearance';
import {
  DEFAULT_USER_APPEARANCE,
  type AccentPresetId,
  type DensityPresetId,
  type RadiusPresetId,
  type ThemeModeId,
  type UserAppearance,
} from './types';

type AppearanceState = UserAppearance & {
  hydrated: boolean;
  orgPolicy: OrgAppearancePolicy | null;
  accentLockedByOrg: boolean;
  bootstrap: () => Promise<void>;
  setOrgPolicy: (policy: OrgAppearancePolicy | null) => void;
  applyCurrent: () => void;
  setThemeMode: (themeMode: ThemeModeId) => Promise<void>;
  setAccentPreset: (accentPresetId: AccentPresetId) => Promise<void>;
  setRadiusPreset: (radiusPreset: RadiusPresetId) => Promise<void>;
  setDensity: (density: DensityPresetId) => Promise<void>;
  reset: () => Promise<void>;
};

function effectiveAppearance(state: AppearanceState) {
  const userPrefs = toAppearancePreferences(state);
  return mergeWithOrgPolicy(userPrefs, state.orgPolicy);
}

function applyState(get: () => AppearanceState) {
  const state = get();
  applyThemeModeToDocument(state.themeMode);
  applyAppearance(effectiveAppearance(state));
}

async function patchAndApply(
  get: () => AppearanceState,
  set: (partial: Partial<AppearanceState>) => void,
  patch: Partial<UserAppearance>,
) {
  const updated = await userAppearanceApi.patch(patch);
  set(updated);
  applyState(get);
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  ...DEFAULT_USER_APPEARANCE,
  hydrated: false,
  orgPolicy: null,
  accentLockedByOrg: false,

  bootstrap: async () => {
    try {
      const user = await userAppearanceApi.get();
      set({ ...user, hydrated: true });
    } catch {
      set({ ...DEFAULT_USER_APPEARANCE, hydrated: true });
    }
    applyState(get);
  },

  setOrgPolicy: (policy) => {
    set({
      orgPolicy: policy,
      accentLockedByOrg: Boolean(policy?.lockAccent),
    });
    applyState(get);
  },

  applyCurrent: () => {
    applyState(get);
  },

  setThemeMode: async (themeMode) => {
    set({ themeMode });
    applyState(get);
    await patchAndApply(get, set, { themeMode });
  },

  setAccentPreset: async (accentPresetId) => {
    if (get().accentLockedByOrg) return;
    set({ accentPresetId });
    applyState(get);
    await patchAndApply(get, set, { accentPresetId });
  },

  setRadiusPreset: async (radiusPreset) => {
    set({ radiusPreset });
    applyState(get);
    await patchAndApply(get, set, { radiusPreset });
  },

  setDensity: async (density) => {
    set({ density });
    applyState(get);
    await patchAndApply(get, set, { density });
  },

  reset: async () => {
    set({ ...DEFAULT_USER_APPEARANCE });
    applyState(get);
    await patchAndApply(get, set, { ...DEFAULT_USER_APPEARANCE });
  },
}));
