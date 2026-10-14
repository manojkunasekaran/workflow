import { describe, expect, it } from 'vitest';
import { buildBrandTheme, isBaselineAppearance, primaryForegroundForPrimary } from '../brandTheme';
import { getAccentPreset } from '../presets';
import { DEFAULT_APPEARANCE_PREFERENCES } from '../types';

describe('brandTheme', () => {
  it('detects baseline appearance', () => {
    expect(isBaselineAppearance(DEFAULT_APPEARANCE_PREFERENCES)).toBe(true);
    expect(
      isBaselineAppearance({
        ...DEFAULT_APPEARANCE_PREFERENCES,
        accentPresetId: 'blue',
      }),
    ).toBe(false);
  });

  it('derives accent and sidebar surfaces from primary', () => {
    const theme = buildBrandTheme(getAccentPreset('blue').light, 'light');
    expect(theme.accent).toMatch(/^\d+/);
    expect(theme.sidebarBackground).toMatch(/^\d+/);
    expect(theme.border).toMatch(/^\d+/);
  });

  it('picks readable primary foreground from lightness', () => {
    expect(primaryForegroundForPrimary('217 91% 42%')).toContain('98%');
    expect(primaryForegroundForPrimary('210 40% 98%')).toContain('8%');
  });
});
