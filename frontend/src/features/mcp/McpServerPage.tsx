import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, Activity, Settings } from 'lucide-react';
import { mcpSettingsApi, type McpSettingsResponse } from '@/api/mcpSettingsApi';
import { McpAuditLogSection } from '@/features/settings/components/McpAuditLogSection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/layouts/PageHeader';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
] as const;

function buildMcpConfig(globalEndpointUrl: string, bearerToken: string): string {
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

export default function McpServerPage() {
    const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('config');
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

    const clientConfigJson = useMemo(() => {
        if (!settings) return '';
        const token = revealedToken ?? '<YOUR_TOKEN>';
        return buildMcpConfig(settings.globalEndpointUrl, token);
    }, [settings, revealedToken]);

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader title={<h1 className="text-sm font-semibold">MCP Server</h1>} />
            <div className="flex-1 overflow-hidden p-6">
                <div className="mx-auto max-w-6xl h-full w-full flex flex-col md:flex-row gap-8 min-h-0">
                    
                    <aside className="w-full md:w-52 shrink-0">
                        <nav className="flex md:flex-col gap-1 overflow-x-auto p-1 bg-muted rounded-lg">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                                            isActive
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
                        {loading || !settings ? (
                            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading MCP server settings...
                            </div>
                        ) : (
                            <>
                                {activeTab === 'config' && (
                                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="mb-4">
                                            <h2 className="text-lg font-medium tracking-tight">Configuration</h2>
                                            <p className="text-sm text-muted-foreground">Manage your MCP server settings and access tokens.</p>
                                        </div>
                                        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-8">
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg">Enable MCP server</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">
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
                                                        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                                                        settings.enabled ? 'bg-primary' : 'bg-input',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform',
                                                            settings.enabled ? 'translate-x-5' : 'translate-x-0',
                                                        )}
                                                    />
                                                </button>
                                            </div>

                                            <UrlCopyRow
                                                label="MCP endpoint URL"
                                                value={settings.globalEndpointUrl}
                                                copied={copiedKey === 'endpoint'}
                                                onCopy={() => copyText('endpoint', settings.globalEndpointUrl)}
                                            />

                                            <div className="space-y-4 pt-6 border-t">
                                                <div>
                                                    <h4 className="font-medium">Inbound auth token</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Bearer token required for external MCP clients.
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs text-muted-foreground">Current token</p>
                                                        <code className="block truncate text-xs mt-1">
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

                                            <div className="space-y-3 pt-6 border-t">
                                                <Label>Client Configuration JSON</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Paste into your MCP client config. Regenerate a token above to embed the real bearer value.
                                                </p>
                                                <div className="relative rounded-md border bg-muted/30">
                                                    <pre className="max-h-48 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{clientConfigJson}</pre>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="absolute right-2 top-2"
                                                        onClick={() => copyText('client', clientConfigJson)}
                                                    >
                                                        {copiedKey === 'client' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-6 border-t">
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
                                        </div>
                                    </section>
                                )}

                                {activeTab === 'audit' && (
                                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <McpAuditLogSection />
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
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
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 mt-4">
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <code className="block truncate text-xs mt-1">{value}</code>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={onCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
}
