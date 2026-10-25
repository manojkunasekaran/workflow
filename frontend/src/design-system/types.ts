export const THEME_MODE_IDS = ['light', 'dark', 'system'] as const;
export type ThemeModeId = (typeof THEME_MODE_IDS)[number];

export const ACCENT_PRESET_IDS = ['default', 'blue', 'teal', 'violet', 'slate'] as const;
export type AccentPresetId = (typeof ACCENT_PRESET_IDS)[number];

export const RADIUS_PRESET_IDS = ['sm', 'md', 'lg'] as const;
export type RadiusPresetId = (typeof RADIUS_PRESET_IDS)[number];

export const DENSITY_PRESET_IDS = ['comfortable', 'compact'] as const;
export type DensityPresetId = (typeof DENSITY_PRESET_IDS)[number];

/** User appearance persisted on the server (source of truth). */
export type UserAppearance = {
  themeMode: ThemeModeId;
  accentPresetId: AccentPresetId;
  density: DensityPresetId;
  radiusPreset: RadiusPresetId;
};

/** Effective tokens applied to the document (user + org policy). */
export type AppearancePreferences = {
  accentPresetId: AccentPresetId;
  radiusPreset: RadiusPresetId;
  density: DensityPresetId;
};

export const DEFAULT_USER_APPEARANCE: UserAppearance = {
  themeMode: 'system',
  accentPresetId: 'default',
  density: 'comfortable',
  radiusPreset: 'md',
};

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  accentPresetId: DEFAULT_USER_APPEARANCE.accentPresetId,
  radiusPreset: DEFAULT_USER_APPEARANCE.radiusPreset,
  density: DEFAULT_USER_APPEARANCE.density,
};

export const RADIUS_CSS: Record<RadiusPresetId, string> = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
};
