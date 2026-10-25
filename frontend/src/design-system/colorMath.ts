export type HslComponents = {
  h: number;
  s: number;
  l: number;
};

const HSL_COMPONENTS_PATTERN =
  /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseHslComponents(value: string): HslComponents {
  const trimmed = value.trim();
  const match = trimmed.match(HSL_COMPONENTS_PATTERN);
  if (!match) {
    throw new Error(`Invalid HSL components: "${value}"`);
  }
  return {
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
  };
}

export function formatHslComponents({ h, s, l }: HslComponents): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(Math.round(s * 10) / 10, 0, 100);
  const lightness = clamp(Math.round(l * 10) / 10, 0, 100);
  return `${hue} ${saturation}% ${lightness}%`;
}

export type ColorMode = 'light' | 'dark';

export function resolveColorMode(): ColorMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
