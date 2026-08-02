import { useEffect, useState } from 'react';
import { credentialApi } from '@/api/credentialApi';
import type { IntegrationCredential } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, KeyRound, Server, ShieldCheck, Trash2, Edit2 } from 'lucide-react';
import { CredentialDialog } from './CredentialDialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export function CredentialsList() {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCred, setSelectedCred] = useState<IntegrationCredential | undefined>();

    const loadCredentials = async () => {
        setIsLoading(true);
        try {
            const data = await credentialApi.getAll();
            setCredentials(data);
        } catch (error) {
            console.error('Failed to load credentials', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCredentials();
    }, []);

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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SMTP':
                return <Server className="h-4 w-4 text-blue-500" />;
            case 'BEARER_TOKEN':
                return <KeyRound className="h-4 w-4 text-amber-500" />;
            default:
                return <ShieldCheck className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 data-testid="credentials-section" className="text-lg font-medium tracking-tight">Integration Credentials</h2>
                    <p className="text-sm text-muted-foreground">Manage secrets and tokens for use in workflow tasks.</p>
                </div>
                <Button onClick={openCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Credential
                </Button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <KeyRound className="h-10 w-10 mb-4 opacity-20" />
                        <p>No credentials found.</p>
                        <p className="text-sm">Click "Add Credential" to securely store your integration secrets.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Updated At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credentials.map((cred) => (
                                <TableRow key={cred.id}>
                                    <TableCell className="font-medium">{cred.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(cred.type)}
                                            <span className="text-sm">{cred.type}</span>
                                        </div>
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

            <CredentialDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                credential={selectedCred}
                onSave={handleSave}
            />
        </div>
    );
}
