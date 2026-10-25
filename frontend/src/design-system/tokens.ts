import type { AccentPresetId } from './types';

type HslTriplet = { h: number; s: number; l: number };

/** Base primary hues per preset (light / dark). Canvas tokens are never derived from these. */
export const PRESET_PRIMARY_BASE: Record<
  AccentPresetId,
  { light: HslTriplet; dark: HslTriplet }
> = {
  default: {
    light: { h: 220, s: 13, l: 18 },
    dark: { h: 210, s: 40, l: 98 },
  },
  blue: {
    light: { h: 217, s: 91, l: 42 },
    dark: { h: 217, s: 91, l: 58 },
  },
  teal: {
    light: { h: 173, s: 58, l: 36 },
    dark: { h: 173, s: 58, l: 52 },
  },
  violet: {
    light: { h: 262, s: 83, l: 48 },
    dark: { h: 262, s: 83, l: 65 },
  },
  slate: {
    light: { h: 215, s: 16, l: 44 },
    dark: { h: 215, s: 20, l: 72 },
  },
};

/** Swatch colors for preset chips (CSS color, not tokens). */
export const PRESET_SWATCH: Record<AccentPresetId, string> = {
  default: 'hsl(220 13% 18%)',
  blue: 'hsl(217 91% 42%)',
  teal: 'hsl(173 58% 36%)',
  violet: 'hsl(262 83% 48%)',
  slate: 'hsl(215 16% 44%)',
};

export const PRESET_LABELS: Record<AccentPresetId, string> = {
  default: 'Default',
  blue: 'Blue',
  teal: 'Teal',
  violet: 'Violet',
  slate: 'Slate',
};
