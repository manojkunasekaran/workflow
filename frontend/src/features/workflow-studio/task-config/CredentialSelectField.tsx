import { useEffect, useState, useCallback } from 'react';
import { credentialApi } from '@/api/credentialApi';
import type { IntegrationCredential } from '@/types/api';
import { SimpleSelect } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CredentialDialog } from '@/features/settings/components/CredentialDialog';
import { Label } from '@/components/ui/label';

interface CredentialSelectFieldProps {
    id?: string;
    label?: React.ReactNode;
    value: unknown;
    onChange: (value: string) => void;
    error?: string;
    description?: string;
    filterType?: string;
    connectorId?: string;
}

export function CredentialSelectField({
    id = 'credential-select',
    label,
    value,
    onChange,
    error,
    description,
    filterType,
    connectorId,
}: CredentialSelectFieldProps) {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await credentialApi.getAll(connectorId);
            if (filterType) {
                setCredentials(data.filter(c => c.type === filterType));
            } else {
                setCredentials(data);
            }
        } catch (err) {
            console.error('Failed to load credentials', err);
        } finally {
            setIsLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = async (cred: IntegrationCredential) => {
        const saved = await credentialApi.create(cred);
        await load();
        if (saved.id) {
            onChange(saved.id);
        }
    };

    const current = String(value ?? '');

    const options = [
        { value: '', label: 'Select a credential (or enter manually below)...' },
        ...credentials.map(c => ({
            value: c.id!,
            label: c.name,
        }))
    ];

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {typeof label === 'string' ? (
                        <Label htmlFor={id}>{label}</Label>
                    ) : label ? (
                        label
                    ) : (
                        <Label htmlFor={id}>Credential</Label>
                    )}
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus className="mr-1 h-3 w-3" /> Create New
                </Button>
            </div>
            <SimpleSelect
                id={id}
                value={current}
                onValueChange={onChange}
                options={options}
                placeholder="Select credential..."
            />
            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}

            <CredentialDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleCreate}
            />
        </div>
    );
}
