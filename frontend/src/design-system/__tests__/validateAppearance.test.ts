import { describe, expect, it } from 'vitest';
import { parseUserAppearance } from '../validateAppearance';
import { DEFAULT_USER_APPEARANCE } from '../types';

describe('parseUserAppearance', () => {
  it('parses valid payload', () => {
    expect(
      parseUserAppearance({
        themeMode: 'dark',
        accentPresetId: 'blue',
        density: 'compact',
        radiusPreset: 'lg',
      }),
    ).toMatchObject({
      themeMode: 'dark',
      accentPresetId: 'blue',
      density: 'compact',
      radiusPreset: 'lg',
    });
  });

  it('falls back for invalid fields', () => {
    const r = parseUserAppearance({ themeMode: 'invalid', density: 'wide' });
    expect(r.themeMode).toBe(DEFAULT_USER_APPEARANCE.themeMode);
    expect(r.density).toBe(DEFAULT_USER_APPEARANCE.density);
  });

  it('throws for non-object input', () => {
    expect(() => parseUserAppearance(null)).toThrow();
  });
});
