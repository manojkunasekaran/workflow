import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { IntegrationCredential } from '@/types/api';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';

interface CredentialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credential?: IntegrationCredential;
    onSave: (credential: IntegrationCredential) => Promise<void>;
}

export function CredentialDialog({ open, onOpenChange, credential, onSave }: CredentialDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('BEARER_TOKEN');
    const [connectorId, setConnectorId] = useState('');
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    const [oauthError, setOauthError] = useState<string | null>(null);

    // Opens the OAuth2 authorization URL in a popup window and listens for the
    // result message posted by OAuthCallbackPage. On success, closes the dialog
    // so the credentials list refreshes.
    const handleOAuthConnect = (cId: string, displayName: string) => {
        setOauthError(null);
        const width = 600;
        const height = 700;
        const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
        const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
        const popup = window.open(
            `/api/v1/oauth/${cId}/authorize`,
            `oauth_${cId}`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        );

        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from the same origin
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'OAUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                popup?.close();
                onOpenChange(false); // Close dialog — parent should refresh credentials list
            } else if (event.data?.type === 'OAUTH_ERROR') {
                window.removeEventListener('message', handleMessage);
                popup?.close();
                setOauthError(event.data.message ?? `Failed to connect with ${displayName}. Please try again.`);
            }
        };
        window.addEventListener('message', handleMessage);

        // Cleanup listener if popup is closed manually
        const pollClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(pollClosed);
                window.removeEventListener('message', handleMessage);
            }
        }, 500);
    };

    useEffect(() => {
        connectorApi.list().then(setConnectors).catch(console.error);
    }, []);

    useEffect(() => {
        if (open) {
            setName(credential?.name ?? '');
            setType(credential?.type ?? 'BEARER_TOKEN');
            setConnectorId(credential?.connectorId ?? '');
            setCredentials(credential?.credentials ?? {});
        }
    }, [open, credential]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onSave({
                id: credential?.id,
                name,
                type,
                connectorId: connectorId || undefined,
                credentials,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save credential', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateCred = (key: string, value: string) => {
        setCredentials((prev) => ({ ...prev, [key]: value }));
    };

    const handleTypeChange = (val: string) => {
        if (val.startsWith('CONNECTOR:')) {
            const cId = val.replace('CONNECTOR:', '');
            const connector = connectors.find(c => c.connectorId === cId);
            if (connector) {
                setType(connector.authType);
                setConnectorId(cId);
            }
        } else {
            setType(val);
            setConnectorId('');
        }
    };
    
    const selectedConnector = connectors.find(c => c.connectorId === connectorId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[625px] px-4 py-2">
                <DialogHeader className="p-2">
                    <DialogTitle>{credential ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
                    <DialogDescription>
                        {credential
                            ? 'Update your integration credentials. Masked fields (********) will remain unchanged unless edited.'
                            : 'Add a new credential to use securely in your workflows.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 overflow-y-auto px-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Credential Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Production Mail Server"
                        />
                    </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={connectorId ? `CONNECTOR:${connectorId}` : type} onValueChange={handleTypeChange}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SMTP">SMTP Server</SelectItem>
                                    <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                                    <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                                    {connectors.map(c => (
                                        <SelectItem key={c.connectorId} value={`CONNECTOR:${c.connectorId}`}>
                                            {c.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    
                    {selectedConnector && selectedConnector.credentialGuide && (
                        <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                            <p className="font-medium mb-2">How to get {selectedConnector.displayName} credentials:</p>
                            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                                {selectedConnector.credentialGuide.fields.map(f => (
                                    <li key={f.key}>
                                        <span className="font-semibold">{f.label}</span>: {f.hint}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {type === 'SMTP' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input
                                    id="host"
                                    value={credentials.host || ''}
                                    onChange={(e) => updateCred('host', e.target.value)}
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="port">Port</Label>
                                    <Input
                                        id="port"
                                        type="number"
                                        value={credentials.port || ''}
                                        onChange={(e) => updateCred('port', e.target.value)}
                                        placeholder="587"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="security">Security</Label>
                                    <Select
                                        value={credentials.security || 'STARTTLS'}
                                        onValueChange={(val) => updateCred('security', val)}
                                    >
                                        <SelectTrigger id="security">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">None</SelectItem>
                                            <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                                            <SelectItem value="SSL">SSL/TLS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={credentials.username || ''}
                                    onChange={(e) => updateCred('username', e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => updateCred('password', e.target.value)}
                                    placeholder="********"
                                />
                            </div>
                        </>
                    )}

                    {type === 'BEARER_TOKEN' && (
                        <div className="grid gap-2">
                            <Label htmlFor="token">Token</Label>
                            <Input
                                id="token"
                                type="password"
                                value={credentials.token || ''}
                                onChange={(e) => updateCred('token', e.target.value)}
                                placeholder="********"
                            />
                        </div>
                    )}
                    
                    {type === 'API_KEY' && selectedConnector && (
                        <div className="grid gap-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={credentials.apiKey || ''}
                                onChange={(e) => updateCred('apiKey', e.target.value)}
                                placeholder="********"
                            />
                        </div>
                    )}

                    {type === 'OAUTH2' && selectedConnector && (
                        <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-muted/20 space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                {selectedConnector.displayName} uses OAuth2. Click below to securely authorize
                                this application in a popup window.
                            </p>
                            {oauthError && (
                                <p className="text-xs text-destructive bg-destructive/5 rounded p-2 w-full text-center">
                                    {oauthError}
                                </p>
                            )}
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                onClick={() => handleOAuthConnect(selectedConnector.connectorId, selectedConnector.displayName)}
                            >
                                Connect with {selectedConnector.displayName}
                            </button>
                        </div>
                    )}

                    {type === 'BASIC_AUTH' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="basic-username">Username</Label>
                                <Input
                                    id="basic-username"
                                    value={credentials.username || ''}
                                    onChange={(e) => updateCred('username', e.target.value)}
                                    placeholder="api_user"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="basic-password">Password</Label>
                                <Input
                                    id="basic-password"
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => updateCred('password', e.target.value)}
                                    placeholder="********"
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {type !== 'OAUTH2' && (
                        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Credential
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
