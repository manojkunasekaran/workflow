import { useEffect, useState, type ReactNode } from 'react';
import { connectionApi } from '@/api/connectionApi';
import type { IntegrationCredential } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectorConnectionPanel } from '@/features/settings/components/ConnectorConnectionPanel';
import { Loader2, PlusCircle, AlertCircle } from 'lucide-react';

interface ConnectionSelectFieldProps {
    value?: string;
    onChange: (value: string) => void;
    connectorId?: string; // Optional: restrict to specific connector
    authType?: string;
    label?: ReactNode;
    description?: string;
    id?: string;
    error?: string;
    filterType?: string;
}

export function ConnectionSelectField({
    value,
    onChange,
    connectorId,
    authType,
    label = 'Connection',
    description,
    id,
    error,
    filterType
}: ConnectionSelectFieldProps) {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const loadCredentials = async () => {
        setIsLoading(true);
        try {
            const data = await connectionApi.getAll(connectorId);
            let filtered = authType ? data.filter((c) => c.type === authType) : data;
            if (filterType) {
                filtered = filtered.filter((c) => c.type === filterType);
            }
            setCredentials(filtered);
        } catch (error) {
            console.error('Failed to load credentials', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCredentials();
    }, [connectorId, authType]);

    const handleSave = async (cred: IntegrationCredential) => {
        const saved = cred.id ? await connectionApi.update(cred.id, cred) : await connectionApi.create(cred);
        await loadCredentials();
        onChange(saved.id!);
        setIsDialogOpen(false);
    };

    const selectedCred = credentials.find(c => c.id === value);
    const hasError = selectedCred?.connectionStatus === 'EXPIRED' || selectedCred?.connectionStatus === 'REVOKED';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <PlusCircle className="mr-1 h-3 w-3" />
                    New
                </Button>
            </div>
            
            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            {isLoading ? (
                <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading connections...
                </div>
            ) : credentials.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">No connections available</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                        Connect Account
                    </Button>
                </div>
            ) : (
                <div className="space-y-1">
                    <Select value={value || ''} onValueChange={onChange}>
                        <SelectTrigger id={id} className={hasError ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select a connection..." />
                        </SelectTrigger>
                        <SelectContent>
                            {credentials.map((cred) => (
                                <SelectItem key={cred.id} value={cred.id!}>
                                    <div className="flex items-center">
                                        <span>{cred.name}</span>
                                        {cred.connectedAs && <span className="ml-2 text-xs text-muted-foreground">({cred.connectedAs})</span>}
                                        {cred.connectionStatus === 'EXPIRED' && <AlertCircle className="ml-2 h-3 w-3 text-red-500" />}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {hasError && (
                        <p className="text-xs text-red-500 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            This connection has {selectedCred?.connectionStatus?.toLowerCase()}. Please reconnect it in Settings.
                        </p>
                    )}
                    {error && !hasError && (
                        <p className="text-[0.8rem] font-medium text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            )}

            <ConnectorConnectionPanel
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                preselectedConnectorId={connectorId}
                onSave={handleSave}
            />
        </div>
    );
}
