import { useEffect, useRef, useState, type ReactNode } from 'react';
import { connectionApi } from '@/api/connectionApi';
import type { IntegrationCredential } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectorConnectionPanel } from '@/features/settings/components/ConnectorConnectionPanel';
import { PlusCircle, AlertCircle } from 'lucide-react';

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
    label = 'Credential',
    description,
    id,
    error,
    filterType
}: ConnectionSelectFieldProps) {
    const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const loadGenerationRef = useRef(0);

    useEffect(() => {
        const loadId = ++loadGenerationRef.current;
        const loadCredentials = async () => {
            setIsLoading(true);
            try {
                const data = await connectionApi.getAll(connectorId);
                if (loadId !== loadGenerationRef.current) {
                    return;
                }
                let filtered = authType ? data.filter((c) => c.type === authType) : data;
                if (filterType) {
                    filtered = filtered.filter((c) => c.type === filterType);
                }
                setCredentials(filtered);
            } catch (err) {
                console.error('Failed to load credentials', err);
            } finally {
                if (loadId === loadGenerationRef.current) {
                    setIsLoading(false);
                }
            }
        };
        void loadCredentials();
    }, [connectorId, authType, filterType]);

    const reloadCredentials = async () => {
        const loadId = ++loadGenerationRef.current;
        setIsLoading(true);
        try {
            const data = await connectionApi.getAll(connectorId);
            if (loadId !== loadGenerationRef.current) {
                return;
            }
            let filtered = authType ? data.filter((c) => c.type === authType) : data;
            if (filterType) {
                filtered = filtered.filter((c) => c.type === filterType);
            }
            setCredentials(filtered);
        } catch (err) {
            console.error('Failed to load credentials', err);
        } finally {
            if (loadId === loadGenerationRef.current) {
                setIsLoading(false);
            }
        }
    };

    const handleSave = async (cred: IntegrationCredential) => {
        const saved = cred.id ? await connectionApi.update(cred.id, cred) : await connectionApi.create(cred);
        await reloadCredentials();
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
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsDialogOpen(true)}>
                    <PlusCircle className="mr-1 h-3 w-3" />
                    New
                </Button>
            </div>
            
            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            <div className="space-y-1">
                <Select 
                    value={value || ''} 
                    onValueChange={onChange}
                    disabled={isLoading || credentials.length === 0}
                >
                    <SelectTrigger id={id} className={hasError ? 'border-destructive' : ''}>
                        <SelectValue placeholder={
                            isLoading ? "Loading credentials..." : 
                            credentials.length === 0 ? "No credentials available" : 
                            "Select a credential..."
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        {credentials.map((cred) => (
                            <SelectItem key={cred.id} value={cred.id!}>
                                <div className="flex items-center">
                                    <span>{cred.name}</span>
                                    {cred.connectedAs && <span className="ml-2 text-xs text-muted-foreground">({cred.connectedAs})</span>}
                                    {cred.connectionStatus === 'EXPIRED' && <AlertCircle className="ml-2 h-3 w-3 text-destructive" />}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {hasError && (
                    <p className="text-xs text-destructive flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        This credential has {selectedCred?.connectionStatus?.toLowerCase()}. Please re-authenticate it in Settings.
                    </p>
                )}
                {error && !hasError && (
                    <p className="text-[0.8rem] font-medium text-destructive">
                        {error}
                    </p>
                )}
            </div>

            <ConnectorConnectionPanel
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                preselectedConnectorId={connectorId}
                onSave={handleSave}
                onOAuthSuccess={async (result) => {
                    await reloadCredentials();
                    if (result.credentialId) {
                        onChange(result.credentialId);
                    }
                }}
            />
        </div>
    );
}
