import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showOrganizationPicker, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';

/** Platform admin — create organizations; switch only when user has more than one. */
export function PlatformOrganizationsSettings() {
  const me = useAuthStore((s) => s.me);
  const organizations = useOrganizationStore((s) => s.organizations);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);
  const setCurrentOrganizationId = useOrganizationStore((s) => s.setCurrentOrganizationId);
  const createOrganization = useOrganizationStore((s) => s.createOrganization);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showSwitcher = showOrganizationPicker(me);

  const onCreate = async () => {
    setError(null);
    if (!name.trim()) return;
    try {
      await createOrganization(name.trim());
      setName('');
    } catch {
      setError('Could not create organization.');
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-organizations-section">
      <div>
        <h2 className="text-lg font-medium tracking-tight">Organizations</h2>
        <p className="text-sm text-muted-foreground">
          Platform admin: create organizations and configure managed OAuth under Apps → (OAuth app).
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label htmlFor="new-org-name">New organization</Label>
        <div className="flex gap-2">
          <Input
            id="new-org-name"
            data-testid="platform-new-organization-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
          />
          <Button type="button" data-testid="platform-new-organization-btn" onClick={() => void onCreate()}>
            Create
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {showSwitcher ? (
        <ul className="space-y-2" data-testid="platform-organization-list">
          {organizations.map((org) => (
            <li
              key={org.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{org.name}</span>
              {org.id === currentOrganizationId ? (
                <span className="text-xs text-muted-foreground">Current</span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`platform-switch-organization-${org.id}`}
                  onClick={() => setCurrentOrganizationId(org.id)}
                >
                  Switch
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Active organization: {organizations.find((o) => o.id === currentOrganizationId)?.name ?? '—'}
        </p>
      )}
    </div>
  );
}
