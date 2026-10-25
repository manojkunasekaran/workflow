import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { orgAppearanceApi } from '@/api/orgAppearanceApi';
import { useAppearanceStore } from './appearanceStore';
import { applyThemeModeToDocument } from './applyThemeMode';
import type { ThemeModeId } from './types';

type AppearanceProviderProps = {
  children: ReactNode;
};

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const bootstrap = useAppearanceStore((s) => s.bootstrap);
  const applyCurrent = useAppearanceStore((s) => s.applyCurrent);
  const setOrgPolicy = useAppearanceStore((s) => s.setOrgPolicy);
  const themeMode = useAppearanceStore((s) => s.themeMode);
  const hydrated = useAppearanceStore((s) => s.hydrated);

  useLayoutEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    orgAppearanceApi
      .get()
      .then((org) =>
        setOrgPolicy({
          accentPresetId: org.accentPresetId,
          lockAccent: org.lockAccent,
        }),
      )
      .catch(() => setOrgPolicy(null));
  }, [setOrgPolicy]);

  useLayoutEffect(() => {
    if (!hydrated) return;
    applyThemeModeToDocument(themeMode);
    applyCurrent();
  }, [themeMode, hydrated, applyCurrent]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyThemeModeToDocument('system' satisfies ThemeModeId);
      applyCurrent();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode, applyCurrent]);

  return children;
}
