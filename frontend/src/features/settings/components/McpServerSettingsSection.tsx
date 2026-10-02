import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { mcpSettingsApi, type McpSettingsResponse } from '@/api/mcpSettingsApi';
import { McpAuditLogSection } from '@/features/settings/components/McpAuditLogSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function buildCursorMcpConfig(globalEndpointUrl: string, bearerToken: string): string {
    const url = globalEndpointUrl.replace(/\/$/, '');
    return JSON.stringify(
        {
            mcpServers: {
                workflow: {
                    url,
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                },
            },
        },
        null,
        2,
    );
}

export function McpServerSettingsSection() {
    const [settings, setSettings] = useState<McpSettingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [revealedToken, setRevealedToken] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setSettings(await mcpSettingsApi.get());
        } catch (err) {
            console.error('Failed to load MCP settings', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (patch: {
        enabled?: boolean;
        globalEndpointPath?: string;
        allowStdioTransport?: boolean;
    }) => {
        setSaving(true);
        try {
            const updated = await mcpSettingsApi.update(patch);
            setSettings(updated);
        } catch (err) {
            console.error('Failed to save MCP settings', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!confirm('Regenerate the MCP auth token? The previous token will stop working immediately.')) {
            return;
        }
        setRegenerating(true);
        try {
            const result = await mcpSettingsApi.regenerateToken();
            setRevealedToken(result.token);
            await load();
        } catch (err) {
            console.error('Failed to regenerate MCP auth token', err);
        } finally {
            setRegenerating(false);
        }
    };

    const copyText = async (key: string, text: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const cursorConfigJson = useMemo(() => {
        if (!settings) return '';
        const token = revealedToken ?? '<YOUR_TOKEN>';
        return buildCursorMcpConfig(settings.globalEndpointUrl, token);
    }, [settings, revealedToken]);

    if (loading || !settings) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading MCP server settings...
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Enable MCP server</h3>
                    <p className="text-sm text-muted-foreground">
                        Expose workflow-backed tools to external MCP clients via Streamable HTTP.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enabled}
                    disabled={saving}
                    onClick={() => save({ enabled: !settings.enabled })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                        settings.enabled ? 'bg-primary' : 'bg-input',
                    )}
                >
                    <span
                        className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                            settings.enabled ? 'translate-x-4' : 'translate-x-0',
                        )}
                    />
                </button>
            </div>

            <div className="space-y-2">
                <Label>MCP endpoint path</Label>
                <Input
                    value={settings.globalEndpointPath}
                    onChange={(e) => setSettings({ ...settings, globalEndpointPath: e.target.value })}
                    onBlur={() => save({ globalEndpointPath: settings.globalEndpointPath })}
                    disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                    Relative to the API base URL. Default <code>/mcp</code> → full URL{' '}
                    <code>{settings.globalEndpointUrl}</code>. Restart required after changing this path.
                </p>
            </div>

            <UrlCopyRow
                label="MCP endpoint URL"
                value={settings.globalEndpointUrl}
                copied={copiedKey === 'endpoint'}
                onCopy={() => copyText('endpoint', settings.globalEndpointUrl)}
            />

            <div className="space-y-4 pt-4 border-t">
                <div>
                    <h4 className="font-medium">Inbound auth token</h4>
                    <p className="text-sm text-muted-foreground">
                        Bearer token required for external MCP clients (Cursor, Claude Desktop).
                    </p>
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Current token</p>
                        <code className="block truncate text-xs">
                            {settings.hasAuthToken
                                ? settings.authTokenMasked || 'mcp_****'
                                : 'No token generated yet'}
                        </code>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateToken}
                        disabled={regenerating || saving}
                    >
                        {regenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-1.5" />
                                Regenerate
                            </>
                        )}
                    </Button>
                </div>

                {revealedToken && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <div className="flex items-start gap-2 text-amber-800">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="text-xs">
                                Copy this token now. It will not be shown again after you leave this page.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded border bg-white px-2 py-1 text-xs font-mono">
                                {revealedToken}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyText('token', revealedToken)}
                            >
                                {copiedKey === 'token' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <Label>Cursor / Claude Desktop config</Label>
                <p className="text-xs text-muted-foreground">
                    Paste into your MCP client config. Regenerate a token above to embed the real bearer value.
                </p>
                <div className="relative rounded-md border bg-muted/30">
                    <pre className="max-h-48 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{cursorConfigJson}</pre>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={() => copyText('cursor', cursorConfigJson)}
                    >
                        {copiedKey === 'cursor' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
                <div>
                    <h4 className="font-medium">Allow STDIO transport</h4>
                    <p className="text-sm text-muted-foreground">
                        Self-hosted only. Lets outbound MCP credentials spawn local processes via STDIO.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={settings.allowStdioTransport ?? false}
                    disabled={saving}
                    onClick={() => save({ allowStdioTransport: !settings.allowStdioTransport })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                        settings.allowStdioTransport ? 'bg-primary' : 'bg-input',
                    )}
                >
                    <span
                        className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                            settings.allowStdioTransport ? 'translate-x-4' : 'translate-x-0',
                        )}
                    />
                </button>
            </div>

            <McpAuditLogSection />
        </div>
    );
}

function UrlCopyRow({
    label,
    value,
    copied,
    onCopy,
}: {
    label: string;
    value: string;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <code className="block truncate text-xs">{value}</code>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={onCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
}
