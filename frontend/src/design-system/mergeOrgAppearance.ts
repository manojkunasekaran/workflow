import type { AccentPresetId, AppearancePreferences, UserAppearance } from './types';

export type OrgAppearancePolicy = {
  accentPresetId?: AccentPresetId | null;
  lockAccent?: boolean;
};

export function toAppearancePreferences(user: UserAppearance): AppearancePreferences {
  return {
    accentPresetId: user.accentPresetId,
    radiusPreset: user.radiusPreset,
    density: user.density,
  };
}

/** User prefs merged with org policy (org lock wins on accent). */
export function mergeWithOrgPolicy(
  user: AppearancePreferences,
  org: OrgAppearancePolicy | null,
): AppearancePreferences {
  if (!org?.lockAccent || !org.accentPresetId) {
    return user;
  }
  return {
    ...user,
    accentPresetId: org.accentPresetId,
  };
}
