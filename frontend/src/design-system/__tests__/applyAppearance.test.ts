import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyAppearance,
  clearAppearanceOverrides,
  resolveColorMode,
} from '../applyAppearance';
import { parseHslComponents } from '../colorMath';
import { DEFAULT_APPEARANCE_PREFERENCES } from '../types';

describe('applyAppearance', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    clearAppearanceOverrides();
  });

  afterEach(() => {
    clearAppearanceOverrides();
    document.documentElement.classList.remove('dark');
  });

  it('resolves color mode from html class', () => {
    expect(resolveColorMode()).toBe('light');
    document.documentElement.classList.add('dark');
    expect(resolveColorMode()).toBe('dark');
  });

  it('baseline default clears inline brand overrides', () => {
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      accentPresetId: 'blue',
    });
    expect(document.documentElement.style.getPropertyValue('--primary').trim()).not.toBe('');
    applyAppearance(DEFAULT_APPEARANCE_PREFERENCES);
    expect(document.documentElement.style.getPropertyValue('--primary').trim()).toBe('');
  });

  it('colored preset sets accent and sidebar tokens', () => {
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      accentPresetId: 'teal',
    });
    expect(document.documentElement.style.getPropertyValue('--accent').trim()).not.toBe('');
    expect(
      document.documentElement.style.getPropertyValue('--sidebar-accent').trim(),
    ).not.toBe('');
  });

  it('applies blue preset with hue in light mode', () => {
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      accentPresetId: 'blue',
    });
    const primary = document.documentElement.style
      .getPropertyValue('--primary')
      .trim();
    const parsed = parseHslComponents(primary);
    expect(parsed.h).toBeGreaterThan(200);
    expect(parsed.h).toBeLessThan(240);
  });

  it('uses dark preset tokens when dark class is present', () => {
    document.documentElement.classList.add('dark');
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      accentPresetId: 'teal',
    });
    const primary = document.documentElement.style
      .getPropertyValue('--primary')
      .trim();
    const parsed = parseHslComponents(primary);
    expect(parsed.h).toBeGreaterThan(160);
    expect(parsed.h).toBeLessThan(190);
  });

  it('toggles density-compact class on html', () => {
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      density: 'comfortable',
    });
    expect(document.documentElement.classList.contains('density-compact')).toBe(false);
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      density: 'compact',
    });
    expect(document.documentElement.classList.contains('density-compact')).toBe(true);
  });

  it('does not set canvas CSS variables', () => {
    applyAppearance({
      ...DEFAULT_APPEARANCE_PREFERENCES,
      accentPresetId: 'violet',
    });
    expect(
      document.documentElement.style.getPropertyValue('--canvas-bg'),
    ).toBe('');
    expect(
      document.documentElement.style.getPropertyValue('--canvas-dots'),
    ).toBe('');
  });
});
