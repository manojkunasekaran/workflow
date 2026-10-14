import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showOrganizationPicker, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';

export function OrganizationSwitcher() {
  const me = useAuthStore((s) => s.me);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);
  const switchOrganization = useOrganizationStore((s) => s.switchOrganization);

  if (!showOrganizationPicker(me)) {
    return null;
  }

  const organizations = me?.organizations ?? [];

  return (
    <div className="px-2 py-2 group-data-[collapsible=icon]:hidden" data-testid="organization-switcher">
      <Select
        value={currentOrganizationId ?? undefined}
        onValueChange={(id) => {
          void switchOrganization(id);
        }}
      >
        <SelectTrigger className="w-full text-xs" aria-label="Active organization">
          <SelectValue placeholder="Organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
