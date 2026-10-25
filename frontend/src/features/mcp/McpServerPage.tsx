import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Loader2, Activity, Settings, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { mcpSettingsApi, type McpSettingsResponse } from '@/api/mcpSettingsApi';
import { McpAuditLogSection } from '@/features/settings/components/McpAuditLogSection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/layouts/PageHeader';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
] as const;

function buildMcpConfig(globalEndpointUrl?: string, bearerToken?: string): string {
    const url = (globalEndpointUrl || '').replace(/\/$/, '');
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
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [revealedToken, setRevealedToken] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('mcp_sub_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('mcp_sub_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSettings(await mcpSettingsApi.get());
        } catch (err) {
            console.error('Failed to load MCP settings', err);
            setError("Unable to load MCP server settings. Please try again.");
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
            <PageHeader
                title={<h1 className="text-sm font-semibold">MCP Server</h1>}
            />
            <div className="flex-1 overflow-hidden p-[var(--density-page-p)]">
                <div className="mx-auto max-w-6xl h-full w-full flex flex-col md:flex-row gap-[var(--density-section-gap)] min-h-0">
                    
                    <aside
                        className={cn(
                            'group relative transition-all duration-200 shrink-0',
                            isSidebarCollapsed ? 'w-full md:w-16' : 'w-full md:w-56',
                        )}
                    >
                        {/* Hover-revealed collapse/expand button on the outer right edge */}
                        <button
                            type="button"
                            data-testid="mcp-sidebar-toggle-btn"
                            onClick={toggleSidebar}
                            className="absolute -right-3 top-4 z-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                        </button>

                        <nav className="relative flex md:flex-col gap-1.5 overflow-x-auto p-1.5 bg-muted/60 rounded-xl border border-border/50">
                            {!isSidebarCollapsed && (
                                <div className="hidden md:flex items-center px-2 pt-1 pb-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                        Server
                                    </span>
                                </div>
                            )}
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <Tooltip key={tab.id} delayDuration={isSidebarCollapsed ? 100 : 999999}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                data-testid={`mcp-tab-${tab.id}`}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={cn(
                                                    'w-full flex items-center rounded-lg py-[var(--density-sidebar-item-py)] text-sm font-medium transition-all whitespace-nowrap min-h-[var(--density-sidebar-item-h)]',
                                                    isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                                                    isActive
                                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        'h-4 w-4 shrink-0',
                                                        isActive ? 'text-primary' : 'text-muted-foreground'
                                                    )}
                                                />
                                                {!isSidebarCollapsed && (
                                                    <div className="text-left min-w-0">
                                                        <div>{tab.label}</div>
                                                    </div>
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        {isSidebarCollapsed && (
                                            <TooltipContent side="right">
                                                {tab.label}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
                        {loading ? (
                            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading MCP server settings...
                            </div>
                        ) : error ? (
                            <ErrorBanner
                                data-testid="mcp-server-error"
                                message={error}
                                onRetry={load}
                            />
                        ) : settings ? (
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
                                                    <div className="rounded-md border border-warning/30 bg-warning-muted p-3 space-y-2">
                                                        <div className="flex items-start gap-2 text-warning">
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
                        ) : null}
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
