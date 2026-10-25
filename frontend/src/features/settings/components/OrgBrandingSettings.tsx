import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoaderState } from '@/components/ui/loader-state';
import { ACCENT_PRESET_IDS, PRESET_LABELS, useAppearanceStore } from '@/design-system';
import { orgAppearanceApi, type OrgAppearance } from '@/api/orgAppearanceApi';
import { cn } from '@/lib/utils';

export interface OrgBrandingSettingsHandle {
  refresh: () => Promise<void>;
}

export const OrgBrandingSettings = forwardRef<OrgBrandingSettingsHandle>(
  function OrgBrandingSettings(_props, ref) {
  const setOrgPolicy = useAppearanceStore((s) => s.setOrgPolicy);
  const [data, setData] = useState<OrgAppearance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [preset, setPreset] = useState<string>('default');
  const [lockAccent, setLockAccent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadBranding = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const org = await orgAppearanceApi.get();
      setData(org);
      setLogoUrl(org.logoUrl ?? '');
      setPreset(org.accentPresetId);
      setLockAccent(org.lockAccent);
    } catch {
      setError('Unable to load organization branding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: loadBranding,
  }), [loadBranding]);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  const save = async () => {
    setError(null);
    setSaved(false);
    try {
      const updated = await orgAppearanceApi.update({
        accentPresetId: preset as OrgAppearance['accentPresetId'],
        logoUrl: logoUrl.trim() || null,
        lockAccent,
      });
      setData(updated);
      setOrgPolicy({
        accentPresetId: updated.accentPresetId,
        lockAccent: updated.lockAccent,
      });
      setSaved(true);
    } catch {
      setError('Save failed. Check preset and logo URL (https only).');
    }
  };

  if (isLoading) {
    return <LoaderState className="py-16" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-6" data-testid="org-branding-section">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Organization branding</h2>
          <p className="text-sm text-muted-foreground">
            Org-wide accent and logo. Locking accent overrides user appearance presets.
          </p>
        </div>
        <ErrorBanner message={error} onRetry={loadBranding} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="org-branding-section">
      <div>
        <h2 className="text-lg font-medium tracking-tight">Organization branding</h2>
        <p className="text-sm text-muted-foreground">
          Org-wide accent and logo. Locking accent overrides user appearance presets.
        </p>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      {saved ? (
        <p className="text-sm text-success" data-testid="org-branding-saved">
          Saved. Reload may be needed for all users to pick up lock policy.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label>Org accent preset</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`org-preset-${id}`}
              onClick={() => setPreset(id)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                preset === id ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              {PRESET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-logo-url">Logo URL</Label>
        <Input
          id="org-logo-url"
          data-testid="org-logo-url-input"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid="org-lock-accent"
          checked={lockAccent}
          onChange={(e) => setLockAccent(e.target.checked)}
        />
        Lock accent for all users
      </label>
      <Button data-testid="org-branding-save-btn" onClick={() => void save()} disabled={!data}>
        Save organization branding
      </Button>
    </div>
  );
});
