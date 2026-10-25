import { formatHslComponents, parseHslComponents, type ColorMode } from './colorMath';
import type { PrimaryModeTokens } from './presets';
import type { AppearancePreferences } from './types';
import { DEFAULT_APPEARANCE_PREFERENCES } from './types';

/** CSS variables written by applyAppearance (never canvas/chart). */
export const BRAND_CSS_VAR_NAMES = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--accent',
  '--accent-foreground',
  '--sidebar-background',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-ring',
  '--border',
] as const;

export type BrandThemeTokens = PrimaryModeTokens & {
  accent: string;
  accentForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBackground: string;
  sidebarPrimaryForeground: string;
  border: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Readable text on top of a filled primary control. */
export function primaryForegroundForPrimary(primary: string): string {
  const { l } = parseHslComponents(primary);
  return l >= 52 ? '222 47% 8%' : '210 40% 98%';
}

type HslComponents = ReturnType<typeof parseHslComponents>;

function deriveSurfaces(primary: HslComponents, mode: ColorMode): Pick<
  BrandThemeTokens,
  | 'accent'
  | 'accentForeground'
  | 'sidebarAccent'
  | 'sidebarAccentForeground'
  | 'sidebarBackground'
  | 'border'
> {
  const h = primary.h;
  const s = primary.s;

  if (mode === 'light') {
    return {
      accent: formatHslComponents({
        h,
        s: clamp(s * 0.35, 10, 42),
        l: 96,
      }),
      accentForeground: formatHslComponents({
        h,
        s: clamp(s * 0.55, 14, 55),
        l: 22,
      }),
      sidebarAccent: formatHslComponents({
        h,
        s: clamp(s * 0.4, 12, 48),
        l: 94,
      }),
      sidebarAccentForeground: formatHslComponents({
        h,
        s: clamp(s * 0.5, 14, 55),
        l: 20,
      }),
      sidebarBackground: formatHslComponents({ h, s: clamp(s * 0.12, 4, 18), l: 99 }),
      border: formatHslComponents({ h, s: clamp(s * 0.15, 6, 22), l: 90 }),
    };
  }

  return {
    accent: formatHslComponents({
      h,
      s: clamp(s * 0.28, 8, 36),
      l: 16,
    }),
    accentForeground: formatHslComponents({
      h,
      s: clamp(s * 0.45, 10, 50),
      l: 92,
    }),
    sidebarAccent: formatHslComponents({
      h,
      s: clamp(s * 0.32, 10, 40),
      l: 18,
    }),
    sidebarAccentForeground: formatHslComponents({
      h,
      s: clamp(s * 0.45, 12, 52),
      l: 94,
    }),
    sidebarBackground: formatHslComponents({ h, s: clamp(s * 0.08, 4, 14), l: 8 }),
    border: formatHslComponents({ h, s: clamp(s * 0.12, 6, 20), l: 20 }),
  };
}

export function buildBrandTheme(base: PrimaryModeTokens, mode: ColorMode): BrandThemeTokens {
  const primary = base.primary;
  const primaryParsed = parseHslComponents(primary);
  const surfaces = deriveSurfaces(primaryParsed, mode);
  const primaryForeground = primaryForegroundForPrimary(primary);

  return {
    primary,
    primaryForeground,
    ring: base.ring,
    sidebarPrimary: base.sidebarPrimary,
    sidebarRing: base.sidebarRing,
    sidebarPrimaryForeground: primaryForeground,
    ...surfaces,
  };
}

/** True when user prefs match shipped CSS defaults (no inline brand overrides). */
export function isBaselineAppearance(prefs: AppearancePreferences): boolean {
  return prefs.accentPresetId === DEFAULT_APPEARANCE_PREFERENCES.accentPresetId;
}
