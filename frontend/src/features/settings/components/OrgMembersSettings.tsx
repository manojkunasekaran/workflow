import { useEffect, useState, forwardRef, useImperativeHandle, useCallback, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimpleSelect } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { LoaderState } from '@/components/ui/loader-state';
import {
  orgMembersApi,
  type OrganizationRole,
  type OrgMemberResponse,
} from '@/api/orgMembersApi';
import { useAuthStore } from '@/auth/authStore';
import { cn } from '@/lib/utils';
import { Loader2, MoreHorizontal, Plus, RefreshCw, ShieldCheck, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';

export interface OrgMembersSettingsHandle {
  refresh: () => Promise<void>;
  openAddMember: () => void;
}

export const OrgMembersSettings = forwardRef<OrgMembersSettingsHandle>(
  function OrgMembersSettings(_props, ref) {
  const me = useAuthStore((s) => s.me);
  const [members, setMembers] = useState<OrgMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add member dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<OrganizationRole>('MEMBER');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const getActiveOrgRole = () => {
    if (!me?.activeOrganizationId) return null;
    return me.organizations?.find((o) => o.id === me.activeOrganizationId)?.role ?? null;
  };
  const isOrgAdminUser = Boolean(me?.platformAdmin || getActiveOrgRole() === 'ORGANIZATION_ADMIN');

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await orgMembersApi.listMembers();
      setMembers(data);
    } catch {
      setError('Unable to load organization members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchMembers,
    openAddMember: () => {
      setAddError(null);
      setIsAddDialogOpen(true);
    },
  }), [fetchMembers]);

  useEffect(() => {
    if (isOrgAdminUser) {
      void fetchMembers();
    }
  }, [me?.activeOrganizationId, isOrgAdminUser, fetchMembers]);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) return;

    setAddError(null);
    setSuccessMessage(null);
    setIsAdding(true);
    try {
      const created = await orgMembersApi.addMember({
        userId: newUserId.trim(),
        role: newRole,
      });
      setMembers((prev) => [...prev, created]);
      setNewUserId('');
      setNewRole('MEMBER');
      setIsAddDialogOpen(false);
      setSuccessMessage('Member added successfully.');
    } catch {
      setAddError('Unable to add member. Please verify the user details and try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (member: OrgMemberResponse, nextRole: OrganizationRole) => {
    setError(null);
    setSuccessMessage(null);
    setActionPendingId(member.membershipId);
    try {
      const updated = await orgMembersApi.updateMemberRole(member.membershipId, { role: nextRole });
      setMembers((prev) =>
        prev.map((m) => (m.membershipId === member.membershipId ? updated : m))
      );
      setSuccessMessage(`Role updated to ${nextRole === 'ORGANIZATION_ADMIN' ? 'Org admin' : 'Member'}.`);
    } catch {
      setError('Unable to update member role. Please try again.');
    } finally {
      setActionPendingId(null);
    }
  };

  const handleRemoveMember = async (member: OrgMemberResponse) => {
    const memberLabel = member.displayName || member.email || member.userId;
    if (!window.confirm(`Are you sure you want to remove "${memberLabel}" from the organization?`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setActionPendingId(member.membershipId);
    try {
      await orgMembersApi.removeMember(member.membershipId);
      setMembers((prev) => prev.filter((m) => m.membershipId !== member.membershipId));
      setSuccessMessage(`Member "${memberLabel}" removed.`);
    } catch {
      setError('Unable to remove member. Please try again.');
    } finally {
      setActionPendingId(null);
    }
  };

  const formatJoinedDate = (joinedAt: string | null) => {
    if (!joinedAt) return '—';
    try {
      return new Date(joinedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return joinedAt;
    }
  };

  if (!isOrgAdminUser) {
    return (
      <div className="p-4 text-sm text-muted-foreground" data-testid="org-members-forbidden">
        You must be an Organization Admin or Platform Admin to manage members.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="org-members-section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Organization members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage member permissions, invite team members, and administer roles for this organization.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchMembers()}
            disabled={isLoading}
            data-testid="refresh-members-btn"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAddError(null);
              setIsAddDialogOpen(true);
            }}
            data-testid="open-add-member-dialog-btn"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add member
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorBanner
          data-testid="org-members-error"
          message={error}
          onRetry={fetchMembers}
        />
      ) : null}
      {successMessage ? (
        <p className="text-sm text-success" data-testid="org-members-success">
          {successMessage}
        </p>
      ) : null}

      {!error && (
        <>
          {/* Members Table */}
          {isLoading ? (
            <LoaderState className="py-16" />
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members found"
              description="Click Add member above to invite users to this organization."
            />
          ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table data-testid="members-table">
            <TableHeader>
              <TableRow>
                <TableHead>Avatar / Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.userId === me?.userId;
                const displayName = member.displayName || member.userId;
                const isPending = actionPendingId === member.membershipId;

                return (
                  <TableRow key={member.membershipId || member.userId} data-testid={`member-row-${member.membershipId || member.userId}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.pictureUrl ? (
                          <img
                            src={member.pictureUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs ring-1 ring-border">
                            {(member.displayName || member.email || member.userId || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{displayName}</span>
                            {isCurrentUser && (
                              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          {member.displayName && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {member.userId}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={member.role === 'ORGANIZATION_ADMIN' ? 'info' : 'neutral'}
                        size="sm"
                        className="normal-case font-medium"
                      >
                        {member.role === 'ORGANIZATION_ADMIN' ? 'Org admin' : 'Member'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatJoinedDate(member.joinedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isCurrentUser ? (
                        <span className="text-xs text-muted-foreground italic">Current user</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              data-testid={`member-actions-btn-${member.membershipId}`}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'MEMBER' ? (
                              <DropdownMenuItem
                                data-testid={`promote-member-${member.membershipId}`}
                                onClick={() => void handleUpdateRole(member, 'ORGANIZATION_ADMIN')}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                                Promote to Org Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                data-testid={`demote-member-${member.membershipId}`}
                                onClick={() => void handleUpdateRole(member, 'MEMBER')}
                              >
                                <UserMinus className="mr-2 h-4 w-4 text-muted-foreground" />
                                Demote to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              data-testid={`remove-member-${member.membershipId}`}
                              onClick={() => void handleRemoveMember(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

      {/* Add Member Popup Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md p-6" data-testid="add-member-dialog">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight">
              <UserPlus className="h-5 w-5 text-primary" />
              Add organization member
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the user ID and select an initial role to add a new member to this organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 py-2">
            {addError ? (
              <p className="text-sm text-destructive" data-testid="add-member-dialog-error">
                {addError}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="new-member-userId" className="text-xs font-medium text-foreground">
                User ID
              </Label>
              <Input
                id="new-member-userId"
                data-testid="new-member-user-id-input"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Enter user ID (e.g. user@workflow.local)"
                disabled={isAdding}
                autoFocus
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-member-role" className="text-xs font-medium text-foreground">
                Role
              </Label>
              <SimpleSelect
                id="new-member-role"
                value={newRole}
                onValueChange={(val) => setNewRole(val as OrganizationRole)}
                options={[
                  { value: 'MEMBER', label: 'Member' },
                  { value: 'ORGANIZATION_ADMIN', label: 'Org admin' },
                ]}
                disabled={isAdding}
              />
            </div>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                data-testid="add-member-btn"
                disabled={isAdding || !newUserId.trim()}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});
