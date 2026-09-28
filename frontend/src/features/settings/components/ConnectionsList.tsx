import { useEffect, useState } from 'react';
import { connectionApi } from '@/api/connectionApi';
import type { IntegrationCredential } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Loader2, Plus, KeyRound, Trash2, Edit2 } from 'lucide-react';
import { ConnectorConnectionPanel } from './ConnectorConnectionPanel';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export function ConnectionsList() {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCred, setSelectedCred] = useState<IntegrationCredential | undefined>();

    const loadCredentials = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await connectionApi.getAll();
            setCredentials(data);
        } catch (err) {
            console.error('Failed to load connections', err);
            setCredentials([]);
            setError("We couldn't load connections right now.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCredentials();
    }, []);

    const handleSave = async (cred: IntegrationCredential) => {
        if (cred.id) {
            await connectionApi.update(cred.id, cred);
        } else {
            await connectionApi.create(cred);
        }
        await loadCredentials();
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this connection?')) return;
        try {
            await connectionApi.delete(id);
            await loadCredentials();
        } catch (error) {
            console.error('Failed to delete connection', error);
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



    const renderStatusBadge = (status?: string) => {
        if (!status || status === 'UNKNOWN') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
        if (status === 'ACTIVE') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">Active</span>;
        if (status === 'EXPIRED') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">Expired</span>;
        if (status === 'REVOKED') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">Revoked</span>;
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 data-testid="credentials-section" className="text-lg font-medium tracking-tight">Integration Connections</h2>
                    <p className="text-sm text-muted-foreground">Manage accounts and secrets for use in workflow tasks.</p>
                </div>
                <Button onClick={openCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Connection
                </Button>
            </div>

            {error ? (
                <ErrorBanner data-testid="connections-list-error" message={error} />
            ) : null}

            {!error ? (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <KeyRound className="h-10 w-10 mb-4 opacity-20" />
                        <p>No connections found.</p>
                        <p className="text-sm">Click "Add Connection" to securely store your integration secrets.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Updated At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credentials.map((cred) => (
                                <TableRow key={cred.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {cred.name}
                                            {cred.credentialScope === 'PLATFORM' && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">Platform</span>}
                                            {cred.credentialScope === 'ORG_SHARED' && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">Shared</span>}
                                            {(!cred.credentialScope || cred.credentialScope === 'PERSONAL') && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800">Personal</span>}
                                        </div>
                                        {cred.connectedAs && <div className="text-xs text-muted-foreground mt-1">{cred.connectedAs}</div>}
                                    </TableCell>
                                    <TableCell>
                                        {renderStatusBadge(cred.connectionStatus)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {cred.updatedAt ? new Date(cred.updatedAt).toLocaleDateString() : 'N/A'}
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
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
            ) : null}

            <ConnectorConnectionPanel
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                credential={selectedCred}
                onSave={handleSave}
            />
        </div>
    );
}
