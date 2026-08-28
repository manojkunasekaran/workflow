import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Settings2,
    Trash2,
    MoreVertical,
    ArrowRight,
    Settings,
} from 'lucide-react';
import { connectorApi, type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

interface ConnectorListProps {
    scope: 'SYSTEM' | 'TENANT';
    onEdit: (connector: ConnectorManifest) => void;
    onCreate: () => void;
}

export default function ConnectorList({ scope, onEdit, onCreate }: ConnectorListProps) {
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadConnectors = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = scope === 'SYSTEM'
                ? await connectorApi.adminList()
                : await connectorApi.list();
            setConnectors(data);
        } catch (err) {
            console.error('Failed to load connectors', err);
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        loadConnectors();
    }, [loadConnectors]);

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
        return (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-pulse">
                <div className="h-10 bg-muted/50 border-b border-border"></div>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 border-b border-border/50"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground tracking-tight">
                        Integrations Directory
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage {connectors.length} integration{connectors.length !== 1 ? 's' : ''} available to this workspace.
                    </p>
                </div>
                <Button onClick={onCreate} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Connector
                </Button>
            </div>

            {/* Empty state or Table */}
            {connectors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/30">
                    <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <h3 className="text-sm font-medium">No integrations found</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-5">
                        Create a custom connector or install an official one to get started.
                    </p>
                    <Button onClick={onCreate} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Connector
                    </Button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <table className="w-full text-left">
                        <thead className="border-b border-border bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-12"></th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Category</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
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
                                    onClick={() => onEdit(connector)}
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
                                        {connector.actions.length} action{connector.actions.length !== 1 ? 's' : ''}
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
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(connector); }}>
                                                        <Settings2 className="h-4 w-4 mr-2" />
                                                        Configure
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
                                                    onClick={(e) => { e.stopPropagation(); onEdit(connector); }}
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
        </div>
    );
}

