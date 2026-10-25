import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { connectorApi, type ConnectorOAuthPlatformConfig } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getOAuthCallbackRedirectUrl } from '@/lib/oauthConnect';
import { ErrorBanner } from '@/components/ui/error-banner';

interface ConnectorOAuthPlatformCardProps {
    connectorId: string;
    displayName: string;
}

export function ConnectorOAuthPlatformCard({ connectorId, displayName }: ConnectorOAuthPlatformCardProps) {
    const [config, setConfig] = useState<ConnectorOAuthPlatformConfig | null>(null);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await connectorApi.adminGetOAuthPlatform(connectorId);
            setConfig(data);
            setClientId(data.clientId ?? '');
            setClientSecret(data.clientSecret ?? '');
            setEnabled(data.enabled ?? true);
        } catch (e) {
            console.error(e);
            setError('Could not load managed OAuth settings.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [connectorId]);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSavedMessage(null);
        try {
            const saved = await connectorApi.adminSaveOAuthPlatform(connectorId, {
                connectorId,
                clientId: clientId.trim(),
                clientSecret: clientSecret.trim() || undefined,
                enabled,
                configured: config?.configured ?? false,
            });
            setConfig(saved);
            setClientSecret(saved.clientSecret ?? '********');
            setSavedMessage('Managed OAuth credentials saved.');
        } catch (e) {
            console.error(e);
            setError('Failed to save. Check client ID and secret.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card p-6 mb-8 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading managed OAuth…
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 mb-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Platform managed OAuth
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Users connect {displayName} with <strong>Managed OAuth2</strong> using these credentials.
                        Secrets are encrypted at rest — not stored in config files.
                    </p>
                </div>
                {config?.configured ? (
                    <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">Configured</span>
                ) : (
                    <span className="text-xs font-medium text-amber-700 bg-amber-500/10 px-2 py-1 rounded">Not configured</span>
                )}
            </div>

            {error ? <ErrorBanner message={error} /> : null}
            {savedMessage ? <p className="text-sm text-success">{savedMessage}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="platform-oauth-redirect">OAuth redirect URI (register at provider)</Label>
                    <Input id="platform-oauth-redirect" readOnly value={getOAuthCallbackRedirectUrl()} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="platform-oauth-client-id">Client ID</Label>
                    <Input
                        id="platform-oauth-client-id"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="From provider developer console"
                        data-testid="platform-oauth-client-id"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="platform-oauth-client-secret">Client secret</Label>
                    <Input
                        id="platform-oauth-client-secret"
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={config?.configured ? '********' : 'Required'}
                        data-testid="platform-oauth-client-secret"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        data-testid="platform-oauth-enabled"
                    />
                    Allow managed OAuth for this app
                </label>
                <Button onClick={() => void handleSave()} disabled={isSaving} data-testid="platform-oauth-save">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save OAuth app'}
                </Button>
            </div>
        </div>
    );
}
