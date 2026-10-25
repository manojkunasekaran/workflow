import { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchInput } from '@/components/ui/search-input';
import { LoaderState } from '@/components/ui/loader-state';
import { EmptyState } from '@/components/ui/empty-state';
import { organizationApi, type Organization } from '@/api/organizationApi';
import { useOrganizationStore } from '@/organization/organizationStore';
import {
  Building2,
  Plus,
  Users,
  Pencil,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlatformOrganizationsManagementHandle {
  refresh: () => Promise<void>;
  openCreate: () => void;
}

export const PlatformOrganizationsManagement = forwardRef<PlatformOrganizationsManagementHandle>(
  function PlatformOrganizationsManagement(_props, ref) {
  const switchOrganization = useOrganizationStore((s) => s.switchOrganization);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Dialog State
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Dialog State
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Switching state
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadOrganizations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await organizationApi.list();
      setOrganizations(data);
    } catch {
      setError('Unable to load organizations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      refresh: loadOrganizations,
      openCreate: () => setCreateOpen(true),
    }),
    [],
  );

  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await organizationApi.create(newOrgName.trim());
      setNewOrgName('');
      setCreateOpen(false);
      await loadOrganizations();
    } catch {
      setCreateError('Unable to create organization. Please verify the name and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setEditName(org.name);
    setEditError(null);
  };

  const handleUpdate = async () => {
    if (!editingOrg || !editName.trim()) return;
    setIsUpdating(true);
    setEditError(null);
    try {
      await organizationApi.update(editingOrg.id, {
        name: editName.trim(),
        settings: editingOrg.settings,
      });
      setEditingOrg(null);
      await loadOrganizations();
    } catch {
      setEditError('Unable to update organization. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrg) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await organizationApi.delete(deletingOrg.id);
      setDeletingOrg(null);
      await loadOrganizations();
    } catch {
      setDeleteError('Unable to delete organization. Please ensure there are no active dependencies and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSwitch = async (orgId: string) => {
    setSwitchingId(orgId);
    try {
      await switchOrganization(orgId, '/workflows');
    } catch (err) {
      console.error('Failed to switch workspace', err);
      setSwitchingId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6" data-testid="platform-organizations-fleet">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Organizations Fleet</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all customer workspaces, view capacity, and jump into any organization directly.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadOrganizations()}
            disabled={isLoading}
            data-testid="refresh-orgs-fleet-btn"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="platform-create-organization-btn"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Organization
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorBanner
          data-testid="platform-orgs-error"
          message={error}
          onRetry={loadOrganizations}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by organization name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-80"
        />
        <div className="text-xs text-muted-foreground">
          Showing <strong>{filteredOrgs.length}</strong> of <strong>{organizations.length}</strong> organizations
        </div>
      </div>

      {isLoading ? (
        <LoaderState className="py-24" />
      ) : filteredOrgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description={
            searchQuery ? 'No organizations match your search query.' : 'No organizations created yet.'
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="h-[var(--density-table-head-h)] bg-muted/40">
                <TableHead className="w-[35%]">Organization</TableHead>
                <TableHead className="w-[20%]">Created</TableHead>
                <TableHead className="w-[15%] text-center">Members</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => {
                const isCurrent = org.id === currentOrganizationId;
                const isSwitching = switchingId === org.id;

                return (
                  <TableRow key={org.id} className="transition-colors hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{org.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{org.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        <span>{formatDate(org.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                        <Users className="size-3 text-muted-foreground" />
                        {org.memberCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ready</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isCurrent ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled
                            className="h-8 text-xs cursor-default"
                          >
                            Current
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={isSwitching}
                            data-testid={`platform-manage-workspace-${org.id}`}
                            onClick={() => void handleSwitch(org.id)}
                          >
                            {isSwitching ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <ArrowRight className="h-3 w-3 mr-1" />
                            )}
                            Manage
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(org)}
                          title="Rename organization"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={organizations.length <= 1}
                          onClick={() => setDeletingOrg(org)}
                          title="Delete organization"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </>
      )}

      {/* Create Organization Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="text-base font-semibold leading-none tracking-tight">Create New Organization</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a display name to create a new workspace tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {createError && <ErrorBanner message={createError} />}
            <div className="space-y-1.5">
              <Label htmlFor="create-org-name" className="text-xs font-medium text-foreground">Organization Name</Label>
              <Input
                id="create-org-name"
                placeholder="e.g. Acme Global Industries"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                autoFocus
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={isCreating || !newOrgName.trim()}
              data-testid="platform-confirm-create-org-btn"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Modal */}
      <Dialog open={Boolean(editingOrg)} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="text-base font-semibold leading-none tracking-tight">Edit Organization</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update organization display name and configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editError && <ErrorBanner message={editError} />}
            <div className="space-y-1.5">
              <Label htmlFor="edit-org-name" className="text-xs font-medium text-foreground">Organization Name</Label>
              <Input
                id="edit-org-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-xs text-muted-foreground font-mono pt-1">ID: {editingOrg?.id}</p>
            </div>
          </div>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingOrg(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleUpdate()}
              disabled={isUpdating || !editName.trim()}
              data-testid="platform-confirm-edit-org-btn"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Modal */}
      <ConfirmDialog
        open={Boolean(deletingOrg)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingOrg(null);
            setDeleteError(null);
          }
        }}
        title={`Delete Organization "${deletingOrg?.name}"?`}
        description={
          <div className="space-y-2">
            <p>This will permanently delete the organization and its memberships. Active workflows must be removed first.</p>
            {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          </div>
        }
        confirmLabel="Delete Organization"
        isConfirming={isDeleting}
        destructive
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
});
