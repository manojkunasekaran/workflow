import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { credentialApi } from '@/api/credentialApi';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';
import type { IntegrationCredential } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { KeyRound, Server, ShieldCheck, Trash2, Edit2, Plug } from 'lucide-react';
import { ConnectorConnectionPanel } from './ConnectorConnectionPanel';
import { EmptyState } from '@/components/ui/empty-state';
import { LoaderState } from '@/components/ui/loader-state';
import { SearchInput } from '@/components/ui/search-input';
import { ViewToggle } from '@/components/ui/view-toggle';
import { CredentialCard } from './CredentialCard';
import { ConnectorIconDisplay } from '@/features/integrations/components/ConnectorIconDisplay';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface CredentialsListHandle {
    refresh: () => Promise<void>;
    openCreate: () => void;
}

export interface CredentialsListProps {
    connectorId?: string;
    hideFilters?: boolean;
}

export const CredentialsList = forwardRef<CredentialsListHandle, CredentialsListProps>(function CredentialsList(props, ref) {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [connectors, setConnectors] = useState<Record<string, ConnectorManifest>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCred, setSelectedCred] = useState<IntegrationCredential | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const loadCredentials = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [credData, connData] = await Promise.all([
                credentialApi.getAll(props.connectorId),
                connectorApi.list()
            ]);
            
            const connMap = connData.reduce((acc, curr) => {
                acc[curr.connectorId] = curr;
                return acc;
            }, {} as Record<string, ConnectorManifest>);
            
            setConnectors(connMap);
            setCredentials(credData);
        } catch (err) {
            console.error('Failed to load credentials', err);
            setCredentials([]);
            setError("We couldn't load credentials right now.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCredentials();
    }, [props.connectorId]);

    const handleSave = async (cred: IntegrationCredential) => {
        if (cred.id) {
            await credentialApi.update(cred.id, cred);
        } else {
            await credentialApi.create(cred);
        }
        await loadCredentials();
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this credential?')) return;
        try {
            await credentialApi.delete(id);
            await loadCredentials();
        } catch (error) {
            console.error('Failed to delete credential', error);
        }
    };

    const openEdit = (cred: IntegrationCredential) => {
        setSelectedCred(cred);
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setSelectedCred(undefined);
        setIsDialogOpen(true);
    };

    useImperativeHandle(ref, () => ({
        refresh: loadCredentials,
        openCreate,
    }), [loadCredentials]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SMTP':
                return <Server className="h-4 w-4 text-blue-500" />;
            case 'BEARER_TOKEN':
                return <KeyRound className="h-4 w-4 text-amber-500" />;
            case 'MCP_SERVER':
                return <Plug className="h-4 w-4 text-violet-500" />;
            default:
                return <ShieldCheck className="h-4 w-4 text-slate-500" />;
        }
    };

    const filteredCredentials = credentials.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.type.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-4">
            {error ? (
                <ErrorBanner data-testid="credentials-list-error" message={error} />
            ) : null}

            {!error ? (
            <>
                {!props.hideFilters && (
                    <div className="mb-6 flex w-full items-center justify-between">
                        <SearchInput
                            placeholder="Search credentials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-72"
                        />
                        <ViewToggle value={viewMode} onChange={setViewMode} />
                    </div>
                )}
                    {isLoading ? (
                        <LoaderState className="py-24" />
                    ) : filteredCredentials.length === 0 ? (
                        <EmptyState icon={KeyRound} description="No credentials found." />
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredCredentials.map((cred) => (
                                <CredentialCard
                                    key={cred.id}
                                    credential={cred}
                                    connector={cred.connectorId ? connectors[cred.connectorId] : undefined}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded-lg bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>App</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Updated At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCredentials.map((cred) => {
                                        const conn = cred.connectorId ? connectors[cred.connectorId] : undefined;
                                        return (
                                        <TableRow key={cred.id}>
                                            <TableCell className="font-medium">{cred.name}</TableCell>
                                            <TableCell>
                                                {conn ? (
                                                    <div className="flex items-center gap-2">
                                                        <ConnectorIconDisplay icon={conn.icon} name={conn.displayName} size="sm" />
                                                        <span className="text-sm text-muted-foreground">{conn.displayName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(cred.type)}
                                                    <span className="text-sm">{cred.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {cred.updatedAt ? new Date(cred.updatedAt).toLocaleString() : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(cred)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(cred.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </>
            ) : null}

            <ConnectorConnectionPanel
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                credential={selectedCred}
                onSave={handleSave}
            />
        </div>
    );
});
