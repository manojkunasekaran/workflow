import { ACCENT_PRESET_IDS, type AccentPresetId } from '../types';

/** HSL components only (no hsl() wrapper), JSON-serializable. */
export type PrimaryModeTokens = {
  primary: string;
  primaryForeground: string;
  ring: string;
  sidebarPrimary: string;
  sidebarRing: string;
};

export type AccentPresetDefinition = {
  id: AccentPresetId;
  label: string;
  light: PrimaryModeTokens;
  dark: PrimaryModeTokens;
};

export const accentPresets: Record<AccentPresetId, AccentPresetDefinition> = {
  default: {
    id: 'default',
    label: 'Default',
    light: {
      primary: '220 13% 18%',
      primaryForeground: '210 40% 98%',
      ring: '220 9% 46%',
      sidebarPrimary: '220 13% 18%',
      sidebarRing: '220 9% 46%',
    },
    dark: {
      primary: '215 20% 65%',
      primaryForeground: '222 47% 6%',
      ring: '215 20% 65%',
      sidebarPrimary: '215 20% 65%',
      sidebarRing: '215 20% 65%',
    },
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    light: {
      primary: '217 91% 42%',
      primaryForeground: '210 40% 98%',
      ring: '217 91% 42%',
      sidebarPrimary: '217 91% 42%',
      sidebarRing: '217 91% 42%',
    },
    dark: {
      primary: '217 91% 58%',
      primaryForeground: '222 47% 6%',
      ring: '217 91% 60%',
      sidebarPrimary: '217 91% 60%',
      sidebarRing: '217 91% 60%',
    },
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    light: {
      primary: '173 58% 39%',
      primaryForeground: '210 40% 98%',
      ring: '173 58% 39%',
      sidebarPrimary: '173 58% 39%',
      sidebarRing: '173 58% 39%',
    },
    dark: {
      primary: '172 66% 50%',
      primaryForeground: '222 47% 6%',
      ring: '172 66% 50%',
      sidebarPrimary: '172 66% 50%',
      sidebarRing: '172 66% 50%',
    },
  },
  violet: {
    id: 'violet',
    label: 'Violet',
    light: {
      primary: '262 83% 58%',
      primaryForeground: '210 40% 98%',
      ring: '262 83% 58%',
      sidebarPrimary: '262 83% 58%',
      sidebarRing: '262 83% 58%',
    },
    dark: {
      primary: '263 70% 67%',
      primaryForeground: '222 47% 6%',
      ring: '263 70% 67%',
      sidebarPrimary: '263 70% 67%',
      sidebarRing: '263 70% 67%',
    },
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    light: {
      primary: '215 16% 47%',
      primaryForeground: '210 40% 98%',
      ring: '215 16% 47%',
      sidebarPrimary: '215 16% 47%',
      sidebarRing: '215 16% 47%',
    },
    dark: {
      primary: '215 20% 65%',
      primaryForeground: '222 47% 6%',
      ring: '215 20% 65%',
      sidebarPrimary: '215 20% 65%',
      sidebarRing: '215 20% 65%',
    },
  },
};

export function getAccentPreset(id: AccentPresetId): AccentPresetDefinition {
  return accentPresets[id];
}

export const accentPresetList = ACCENT_PRESET_IDS.map((id) => accentPresets[id]);
