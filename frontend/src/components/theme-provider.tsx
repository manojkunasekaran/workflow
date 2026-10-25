import { createContext, useContext } from 'react';
import { useAppearanceStore } from '@/design-system/appearanceStore';
import type { ThemeModeId } from '@/design-system/types';

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: ThemeModeId;
  setTheme: (theme: ThemeModeId) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

/** Theme mode is owned by appearance store + server; this provider exposes the same API to settings UI. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppearanceStore((s) => s.themeMode);
  const setThemeMode = useAppearanceStore((s) => s.setThemeMode);

  const value: ThemeProviderState = {
    theme,
    setTheme: (next) => {
      void setThemeMode(next);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
