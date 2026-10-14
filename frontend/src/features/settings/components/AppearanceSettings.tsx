import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import {
  ACCENT_PRESET_IDS,
  DENSITY_PRESET_IDS,
  PRESET_LABELS,
  PRESET_SWATCH,
  useAppearanceStore,
  type DensityPresetId,
} from '@/design-system';

const DENSITY_COPY: Record<
  DensityPresetId,
  { title: string; description: string }
> = {
  comfortable: {
    title: 'Comfortable',
    description: 'More spacing — easier to read and tap.',
  },
  compact: {
    title: 'Compact',
    description: 'Fits more on screen — ideal for long lists.',
  },
};

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const accentPresetId = useAppearanceStore((s) => s.accentPresetId);
  const density = useAppearanceStore((s) => s.density);
  const accentLockedByOrg = useAppearanceStore((s) => s.accentLockedByOrg);
  const setAccentPreset = useAppearanceStore((s) => s.setAccentPreset);
  const setDensity = useAppearanceStore((s) => s.setDensity);
  const reset = useAppearanceStore((s) => s.reset);

  return (
    <div className="space-y-8" data-testid="appearance-section">
      <p className="text-sm text-muted-foreground max-w-xl">
        Personalize how Workflow360 looks for you. Changes save to your account and apply on every
        device.
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-base">Color mode</Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Light, dark, or match your computer.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            data-testid="theme-light-btn"
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
            className="min-w-[7.5rem]"
          >
            Light
          </Button>
          <Button
            data-testid="theme-dark-btn"
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
            className="min-w-[7.5rem]"
          >
            Dark
          </Button>
          <Button
            data-testid="theme-system-btn"
            variant={theme === 'system' ? 'default' : 'outline'}
            onClick={() => setTheme('system')}
            className="min-w-[7.5rem]"
          >
            System
          </Button>
        </div>
      </div>

      {accentLockedByOrg ? (
        <p className="text-sm text-muted-foreground" data-testid="appearance-org-lock-notice">
          Your organization set the accent color. You can still change color mode and layout density.
        </p>
      ) : null}

      <div className="space-y-3">
        <div>
          <Label className="text-base">Accent color</Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Used for primary actions, links, and navigation highlights.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`appearance-preset-${id}`}
              disabled={accentLockedByOrg}
              onClick={() => void setAccentPreset(id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                accentPresetId === id
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: PRESET_SWATCH[id] }}
                aria-hidden
              />
              {PRESET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-base">Layout density</Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adjust spacing in lists, forms, and the sidebar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          {DENSITY_PRESET_IDS.map((id) => {
            const selected = density === id;
            const copy = DENSITY_COPY[id];
            return (
              <button
                key={id}
                type="button"
                data-testid={`appearance-density-${id}`}
                onClick={() => void setDensity(id)}
                className={cn(
                  'rounded-lg border p-[var(--density-card-p)] text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/30',
                )}
              >
                <p className="font-medium text-sm">{copy.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{copy.description}</p>
                <div className="mt-3 space-y-1.5 rounded-md border bg-background p-2" aria-hidden>
                  <div className="h-[var(--density-control-h-sm)] rounded bg-muted" />
                  <div className="h-[var(--density-control-h-sm)] rounded bg-muted/70 w-4/5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        data-testid="appearance-preview-card"
        className="rounded-lg border bg-card p-[var(--density-card-p)] shadow-sm space-y-3 max-w-xl"
      >
        <p className="text-sm font-medium">Preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Primary action</Button>
          <Button size="sm" variant="outline">
            Secondary
          </Button>
          <StatusBadge variant="success">Active</StatusBadge>
        </div>
        <Input readOnly placeholder="Sample field" className="max-w-xs bg-background" />
      </div>

      <Button
        type="button"
        variant="outline"
        data-testid="appearance-reset-btn"
        onClick={() => void reset()}
      >
        Restore defaults
      </Button>
    </div>
  );
}
