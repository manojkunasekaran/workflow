import { resolveColorMode } from './colorMath';
import {
  BRAND_CSS_VAR_NAMES,
  buildBrandTheme,
  isBaselineAppearance,
} from './brandTheme';
import { getAccentPreset } from './presets';
import type { AppearancePreferences } from './types';
import { RADIUS_CSS } from './types';

export { resolveColorMode };

export function clearAppearanceOverrides(root: HTMLElement = document.documentElement) {
  for (const name of BRAND_CSS_VAR_NAMES) {
    root.style.removeProperty(name);
  }
}

/** Applies enterprise brand tokens — chrome, sidebar, accents; not canvas/chart. */
export function applyAppearance(prefs: AppearancePreferences) {
  const root = document.documentElement;
  const mode = resolveColorMode();

  if (isBaselineAppearance(prefs)) {
    clearAppearanceOverrides(root);
  } else {
    const preset = getAccentPreset(prefs.accentPresetId);
    const base = mode === 'dark' ? preset.dark : preset.light;
    const theme = buildBrandTheme(base, mode);

    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--ring', theme.ring);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-foreground', theme.accentForeground);
    root.style.setProperty('--sidebar-background', theme.sidebarBackground);
    root.style.setProperty('--sidebar-primary', theme.sidebarPrimary);
    root.style.setProperty(
      '--sidebar-primary-foreground',
      theme.sidebarPrimaryForeground,
    );
    root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
    root.style.setProperty(
      '--sidebar-accent-foreground',
      theme.sidebarAccentForeground,
    );
    root.style.setProperty('--sidebar-ring', theme.sidebarRing);
    root.style.setProperty('--border', theme.border);
  }

  root.style.setProperty('--radius', RADIUS_CSS[prefs.radiusPreset]);
  root.classList.toggle('density-compact', prefs.density === 'compact');
}
