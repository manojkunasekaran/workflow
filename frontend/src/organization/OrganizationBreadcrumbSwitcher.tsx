import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Shield, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { isSignedIn, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';
import { cn } from '@/lib/utils';

export function OrganizationBreadcrumbSwitcher() {
  const [menuOpen, setMenuOpen] = useState(false);
  const me = useAuthStore((s) => s.me);
  const organizations = useOrganizationStore((s) => s.organizations);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);
  const switchOrganization = useOrganizationStore((s) => s.switchOrganization);

  const signedIn = isSignedIn(me);
  if (!signedIn) {
    return null;
  }

  // Fallback to organizations list from auth if store is still hydrating
  const availableOrgs = (organizations?.length ?? 0) > 0 ? organizations : (me?.organizations ?? []);
  if (availableOrgs.length === 0) {
    return null;
  }

  const currentOrg =
    availableOrgs.find((o) => o.id === currentOrganizationId) ??
    availableOrgs.find((o) => o.id === me?.activeOrganizationId) ??
    availableOrgs[0];

  const isPlatformAdmin = Boolean(me?.platformAdmin);
  const canSwitch = availableOrgs.length > 1 || isPlatformAdmin;

  // Determine current user's role in active organization
  const activeOrgMembership = me?.organizations?.find((o) => o.id === currentOrg?.id);
  const userRoleLabel = isPlatformAdmin
    ? 'Platform Admin'
    : activeOrgMembership?.role === 'ORGANIZATION_ADMIN'
      ? 'Org Admin'
      : 'Member';

  const RoleIcon = isPlatformAdmin
    ? ShieldCheck
    : activeOrgMembership?.role === 'ORGANIZATION_ADMIN'
      ? Shield
      : User;

  const quickCardContent = (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-semibold text-foreground truncate">{currentOrg?.name}</h4>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            ID: {currentOrg?.id}
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-2 text-[11px] space-y-1.5 border border-border/50">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Your Role</span>
          <span className="font-medium text-foreground flex items-center gap-1">
            <RoleIcon className="h-3 w-3 text-primary shrink-0" />
            {userRoleLabel}
          </span>
        </div>
        {me?.email && (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Signed In</span>
            <span className="font-mono text-[10px] text-foreground truncate max-w-[130px]">
              {me.email}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end pt-0.5 text-[11px]">
        <Link
          to="/settings"
          className="text-primary hover:underline text-[11px] font-medium inline-flex items-center gap-0.5"
        >
          Workspace Settings &rarr;
        </Link>
      </div>
    </div>
  );

  if (!canSwitch) {
    return (
      <HoverCard openDelay={200} closeDelay={150}>
        <HoverCardTrigger asChild>
          <div
            data-testid="org-breadcrumb-badge"
            className="flex items-center gap-1.5 font-medium text-xs text-muted-foreground shrink-0 cursor-default rounded px-1 py-0.5 hover:bg-muted/50 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentOrg?.name || 'Workspace'}</span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72 p-3.5">
          {quickCardContent}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard open={menuOpen ? false : undefined} openDelay={200} closeDelay={150}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <HoverCardTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="org-breadcrumb-switcher"
              className="group inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold text-foreground/90 hover:bg-muted/80 hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors shrink-0"
              aria-label="Switch organization"
            >
              <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-primary transition-opacity duration-150 group-hover:opacity-0" />
                <ChevronsUpDown className="absolute inset-0 h-3.5 w-3.5 text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              </div>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentOrg?.name || 'Select Workspace'}</span>
            </button>
          </DropdownMenuTrigger>
        </HoverCardTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Organizations & Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableOrgs.map((org) => {
            const isActive = org.id === (currentOrganizationId || me?.activeOrganizationId);
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => {
                  if (!isActive) {
                    void switchOrganization(org.id);
                  }
                }}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={cn('truncate', isActive && 'font-semibold')}>{org.name}</span>
                </div>
                {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
          {isPlatformAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                <Link to="/admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Manage all organizations</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <HoverCardContent align="start" className="w-72 p-3.5">
        {quickCardContent}
      </HoverCardContent>
    </HoverCard>
  );
}
