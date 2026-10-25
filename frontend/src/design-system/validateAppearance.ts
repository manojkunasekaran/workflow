import {
  ACCENT_PRESET_IDS,
  DENSITY_PRESET_IDS,
  DEFAULT_USER_APPEARANCE,
  RADIUS_PRESET_IDS,
  THEME_MODE_IDS,
  type UserAppearance,
} from './types';

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function parseUserAppearance(raw: unknown): UserAppearance {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('User appearance must be a JSON object');
  }
  const o = raw as Record<string, unknown>;
  return {
    themeMode: isOneOf(o.themeMode, THEME_MODE_IDS)
      ? o.themeMode
      : DEFAULT_USER_APPEARANCE.themeMode,
    accentPresetId: isOneOf(o.accentPresetId, ACCENT_PRESET_IDS)
      ? o.accentPresetId
      : DEFAULT_USER_APPEARANCE.accentPresetId,
    density: isOneOf(o.density, DENSITY_PRESET_IDS)
      ? o.density
      : DEFAULT_USER_APPEARANCE.density,
    radiusPreset: isOneOf(o.radiusPreset, RADIUS_PRESET_IDS)
      ? o.radiusPreset
      : DEFAULT_USER_APPEARANCE.radiusPreset,
  };
}
