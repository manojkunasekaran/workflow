import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { connectorApi, type ConnectorManifest, type ConnectionSetupField } from '@/api/connectorApi';
import type { IntegrationCredential } from '@/types/api';

interface ConnectorConnectionPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credential?: IntegrationCredential;
    onSave: (cred: IntegrationCredential) => Promise<void>;
    preselectedConnectorId?: string;
}

export function ConnectorConnectionPanel({ open, onOpenChange, credential, onSave, preselectedConnectorId }: ConnectorConnectionPanelProps) {
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
    const [name, setName] = useState('');
    const [fields, setFields] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [credentialScope, setCredentialScope] = useState<'PERSONAL' | 'ORG_SHARED'>('PERSONAL');

    useEffect(() => {
        if (open) {
            loadConnectors();
            if (credential) {
                setSelectedConnectorId(credential.connectorId || '');
                setName(credential.name);
                setCredentialScope((credential.credentialScope as any) || 'PERSONAL');
                setFields({}); // we don't load secrets back
            } else {
                setSelectedConnectorId(preselectedConnectorId || '');
                setName('');
                setCredentialScope('PERSONAL');
                setFields({});
            }
        }
    }, [open, credential, preselectedConnectorId]);

    const loadConnectors = async () => {
        try {
            const data = await connectorApi.list();
            setConnectors(data);
        } catch (error) {
            console.error('Failed to load connectors', error);
        }
    };

    const selectedConnector = connectors.find((c) => c.connectorId === selectedConnectorId);

    const handleSave = async () => {
        if (!selectedConnector) return;
        setIsSaving(true);
        try {
            await onSave({
                id: credential?.id,
                name: name || selectedConnector.displayName + ' Connection',
                type: selectedConnector.authType,
                connectorId: selectedConnector.connectorId,
                credentialScope: credentialScope,
                credentials: fields,
            });
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOAuthConnect = async () => {
        if (!selectedConnector) return;
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(
            '/api/v1/oauth/' + selectedConnector.connectorId + '/authorize',
            'oauth_popup',
            'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left
        );

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'OAUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                onOpenChange(false);
                // In a real app we'd trigger a reload of the parent list here
            }
        };
        window.addEventListener('message', handleMessage);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{credential ? 'Edit Connection' : 'Add Connection'}</DialogTitle>
                    <DialogDescription>
                        {selectedConnector ? selectedConnector.connectionSetup?.description || 'Configure your connection settings below.' : 'Select a service to connect.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!preselectedConnectorId && !credential && (
                        <div className="grid gap-2">
                            <Label>Service</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={selectedConnectorId}
                                onChange={(e) => setSelectedConnectorId(e.target.value)}
                            >
                                <option value="">Select a service...</option>
                                {connectors.map((c) => (
                                    <option key={c.connectorId} value={c.connectorId}>
                                        {c.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedConnector && (
                        <>
                            <div className="grid gap-2">
                                <Label>Connection Name</Label>
                                <Input
                                    placeholder={selectedConnector.displayName + ' Connection'}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Scope</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={credentialScope}
                                    onChange={(e) => setCredentialScope(e.target.value as any)}
                                >
                                    <option value="PERSONAL">Personal (Only you can use this)</option>
                                    <option value="ORG_SHARED">Organization Shared (Available to all members)</option>
                                </select>
                            </div>

                            {selectedConnector.authType === 'OAUTH2' ? (
                                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-slate-50 mt-4">
                                    <img src={selectedConnector.icon} alt={selectedConnector.displayName} className="w-12 h-12 mb-4" />
                                    <Button onClick={handleOAuthConnect} size="lg">
                                        {selectedConnector.connectionSetup?.buttonLabel || 'Sign in with ' + selectedConnector.displayName}
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-4 text-center">
                                        Your data is encrypted and stored securely.
                                    </p>
                                </div>
                            ) : (
                                selectedConnector.connectionSetup?.fields?.map((field: ConnectionSetupField) => (
                                    <div key={field.key} className="grid gap-2">
                                        <Label>{field.label}</Label>
                                        <Input
                                            type={field.sensitive ? 'password' : 'text'}
                                            placeholder={field.placeholder || ''}
                                            value={fields[field.key] || ''}
                                            onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })}
                                        />
                                        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                                        {field.docUrl && <a href={field.docUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Where to find this</a>}
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                {selectedConnector && selectedConnector.authType !== 'OAUTH2' && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Verifying...' : 'Test & Save Connection'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
