import type { ThemeModeId } from './types';

export function resolveSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeModeToDocument(themeMode: ThemeModeId) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (themeMode === 'system') {
    root.classList.add(resolveSystemTheme());
    return;
  }
  root.classList.add(themeMode);
}
