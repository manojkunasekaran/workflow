import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings2,
    Trash2,
    MoreVertical,
    ArrowRight,
    Blocks,
    KeyRound,
    Puzzle,
} from 'lucide-react';
import { connectorApi, type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { LoaderState } from '@/components/ui/loader-state';
import { SearchInput } from '@/components/ui/search-input';
import { ViewToggle } from '@/components/ui/view-toggle';
import { ConnectorCard } from './ConnectorCard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Helpers ────────────────────────────────────────────────────────────────

const AUTH_LABELS: Record<ConnectorAuthType, string> = {
    BEARER_TOKEN: 'API Key',
    API_KEY: 'API Key (Header)',
    BASIC_AUTH: 'Username & Password',
    CUSTOM_HEADER: 'Custom Header',
    OAUTH2: 'OAuth 2.0',
    NONE: 'No Auth Required',
};

function resolveAuthLabel(authType: ConnectorAuthType): string {
    return AUTH_LABELS[authType] ?? authType;
}

function getTaskTypeLabel(type?: string): string {
    switch (type) {
        case 'CONNECTOR_TASK': return 'HTTP Action';
        case 'DB_TASK': return 'SQL Query';
        case 'MONGO_TASK': return 'Mongo Query';
        case 'REDIS_TASK': return 'Redis Command';
        case 'NEO4J_TASK': return 'Graph Query';
        case 'AGENTS_TASK': return 'AI Agent';
        default: return 'Integration';
    }
}

function ConnectorIcon({ connector, className }: { connector: ConnectorManifest, className?: string }) {
    const [imgError, setImgError] = useState(false);

    const isUrl = connector.icon?.startsWith('http');
    const isLocalFile = connector.icon?.endsWith('.svg') || connector.icon?.endsWith('.png');
    const isSvgInline = connector.icon?.startsWith('<');

    const initials = connector.displayName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    if (!imgError && connector.icon && (isUrl || isLocalFile)) {
        return (
            <div className={cn("flex shrink-0 items-center justify-center rounded-md border bg-background overflow-hidden", className)}>
                <img
                    src={isUrl ? connector.icon : `/connectors/${connector.icon}`}
                    alt={connector.displayName}
                    className="h-3/4 w-3/4 object-contain"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    if (isSvgInline && connector.icon) {
        return (
            <div
                className={cn("flex shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground [&>svg]:h-3/4 [&>svg]:w-3/4", className)}
                dangerouslySetInnerHTML={{ __html: connector.icon }}
            />
        );
    }

    // Fallback: initials avatar
    return (
        <div className={cn("flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20", className)}>
            {initials}
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface ConnectorListHandle {
    refresh: () => Promise<void>;
}

interface ConnectorListProps {
    scope?: 'SYSTEM' | 'TENANT';
}

const ConnectorList = forwardRef<ConnectorListHandle, ConnectorListProps>(function ConnectorList(
    { scope },
    ref,
) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'system' | 'tenant'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [allConnectors, setAllConnectors] = useState<ConnectorManifest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConnectors = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await connectorApi.list();
            setAllConnectors(data.filter(c => c.taskType === 'CONNECTOR_TASK'));
        } catch (err) {
            console.error('Failed to load connectors', err);
            setAllConnectors([]);
            setError("We couldn't load apps right now.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConnectors();
    }, [loadConnectors]);

    useImperativeHandle(ref, () => ({ refresh: loadConnectors }), [loadConnectors]);

    const connectors = allConnectors.filter((connector) => {
        // Tab filter
        if (activeTab === 'system' && connector.scope !== 'SYSTEM') return false;
        if (activeTab === 'tenant' && connector.scope !== 'TENANT') return false;

        // Search filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const matchesName = connector.displayName?.toLowerCase().includes(lowerQuery);
            if (!matchesName) return false;
        }

        return true;
    });

    const handleDelete = async (connectorId: string, displayName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${displayName}"?\n\nThis will permanently remove the connector and any workflows using it may break.`)) return;
        try {
            if (scope === 'SYSTEM') {
                await connectorApi.adminDelete(connectorId);
            } else {
                await connectorApi.delete(connectorId);
            }
            loadConnectors();
        } catch (err) {
            console.error('Failed to delete connector', err);
        }
    };

    if (isLoading) {
        return <LoaderState />;
    }

    return (
        <div className="space-y-4">
            {error ? (
                <ErrorBanner data-testid="connector-list-error" message={error} />
            ) : (
                <>
                    <div className="mb-6 flex w-full items-center justify-between">
                        <SearchInput
                            placeholder="Search apps..."
                            className="w-72"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center rounded-lg bg-muted p-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={cn("h-8", activeTab === 'all' && "bg-background shadow-sm")} 
                                    onClick={() => setActiveTab('all')}
                                >
                                    All
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={cn("h-8", activeTab === 'system' && "bg-background shadow-sm")} 
                                    onClick={() => setActiveTab('system')}
                                >
                                    System Apps
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={cn("h-8", activeTab === 'tenant' && "bg-background shadow-sm")} 
                                    onClick={() => setActiveTab('tenant')}
                                >
                                    My Apps
                                </Button>
                            </div>
                            <ViewToggle value={viewMode} onChange={setViewMode} />
                        </div>
                    </div>

                    {connectors.length === 0 ? (
                        <EmptyState 
                            icon={Blocks} 
                            title="No apps yet" 
                            description="Create your first connector to get started." 
                        />
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {connectors.map((connector) => (
                                <ConnectorCard
                                    key={connector.connectorId}
                                    connector={connector}
                                    onNavigate={(path) => navigate(path)}
                                    onDelete={(id, name, e) => handleDelete(id, name, e)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <table className="w-full text-left">
                        <thead className="border-b border-border bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-12"></th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Category</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Auth Type</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {connectors.map((connector) => {
                                return (
                                <tr
                                    key={connector.connectorId}
                                    className="transition-colors hover:bg-muted/30 group cursor-pointer"
                                    onClick={() => navigate(`/apps/${connector.connectorId}`)}
                                >
                                    <td className="px-4 py-3 align-middle">
                                        <ConnectorIcon connector={connector} className="h-8 w-8" />
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <div className="font-medium text-sm text-foreground flex items-center gap-2">
                                            {connector.displayName}
                                            {connector.scope === 'SYSTEM' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">Official</span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">Custom</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle hidden md:table-cell">
                                        {connector.category ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                                {connector.category}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50">?"</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                                        <span className="px-2 py-1 text-xs rounded-full bg-muted">
                                            {getTaskTypeLabel(connector.taskType)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground hidden sm:table-cell">
                                        {resolveAuthLabel(connector.authType)}
                                    </td>
                                    <td className="px-4 py-3 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/apps/${connector.connectorId}`); }}>
                                                        <Settings2 className="h-4 w-4 mr-2" />
                                                        Configure
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/apps/${connector.connectorId}#credentials`); }}>
                                                        <KeyRound className="h-4 w-4 mr-2" />
                                                        Credentials
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/apps/${connector.connectorId}#integrations`); }}>
                                                        <Puzzle className="h-4 w-4 mr-2" />
                                                        Integrations
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                        onClick={(e) => handleDelete(connector.connectorId, connector.displayName, e)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Hint content="Configure connector">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/apps/${connector.connectorId}`); }}
                                                >
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Hint>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                    )}
                </>
            )}
        </div>
    );
});

export default ConnectorList;

