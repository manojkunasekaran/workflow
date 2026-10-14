import { describe, expect, it } from 'vitest';
import { formatHslComponents, parseHslComponents, resolveColorMode } from '../colorMath';

describe('colorMath', () => {
  it('parses and formats HSL components', () => {
    const parsed = parseHslComponents('220 13% 18%');
    expect(parsed).toEqual({ h: 220, s: 13, l: 18 });
    expect(formatHslComponents(parsed)).toBe('220 13% 18%');
  });

  it('wraps hue in formatHslComponents', () => {
    expect(formatHslComponents({ h: 370, s: 50, l: 50 })).toBe('10 50% 50%');
  });

  it('resolves color mode from document', () => {
    document.documentElement.classList.remove('dark');
    expect(resolveColorMode()).toBe('light');
    document.documentElement.classList.add('dark');
    expect(resolveColorMode()).toBe('dark');
    document.documentElement.classList.remove('dark');
  });
});
