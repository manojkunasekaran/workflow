import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Settings2,
    Trash2,
    MoreVertical,
    Zap,
    Lock,
} from 'lucide-react';
import { connectorApi, type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
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

function ConnectorIcon({ connector }: { connector: ConnectorManifest }) {
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background overflow-hidden shadow-sm">
                <img
                    src={isUrl ? connector.icon : `/connectors/${connector.icon}`}
                    alt={connector.displayName}
                    className="h-7 w-7 object-contain"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    if (isSvgInline && connector.icon) {
        return (
            <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm text-muted-foreground [&>svg]:h-7 [&>svg]:w-7"
                dangerouslySetInnerHTML={{ __html: connector.icon }}
            />
        );
    }

    // Fallback: initials avatar
    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
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
            const visible = scope === 'TENANT'
                ? data.filter((c) => c.scope === 'TENANT')
                : data;
            setConnectors(visible);
        } catch (err) {
            console.error('Failed to load connectors', err);
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        loadConnectors();
    }, [loadConnectors]);

    const handleDelete = async (connectorId: string, displayName: string) => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card shadow-sm h-36 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {scope === 'SYSTEM' ? 'Integrations' : 'Custom Connectors'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {scope === 'SYSTEM'
                            ? `${connectors.length} integration${connectors.length !== 1 ? 's' : ''} available across all workspaces.`
                            : 'Build your own internal integrations for this workspace.'}
                    </p>
                </div>
                <Button onClick={onCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Connector
                </Button>
            </div>

            {/* Empty state */}
            {connectors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <Settings2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-base font-medium">No connectors yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
                        {scope === 'SYSTEM'
                            ? 'Re-seed the database or create your first system connector.'
                            : 'Add a custom connector to integrate your internal tools.'}
                    </p>
                    <Button onClick={onCreate} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Connector
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connectors.map((connector) => (
                        <div
                            key={connector.connectorId}
                            className="group rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col hover:shadow-md hover:border-primary/20 transition-all duration-200"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between p-5 pb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <ConnectorIcon connector={connector} />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm leading-snug">{connector.displayName}</p>
                                        {connector.category && (
                                            <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                                                {connector.category}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Overflow menu — danger action lives here, not cluttering the main CTA */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="More options"
                                        >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem onClick={() => onEdit(connector)}>
                                            <Settings2 className="h-3.5 w-3.5 mr-2" />
                                            Configure
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => handleDelete(connector.connectorId, connector.displayName)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                            Delete Connector
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Metadata row */}
                            <div className="px-5 pb-4 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {connector.actions.length} action{connector.actions.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    {resolveAuthLabel(connector.authType)}
                                </span>
                            </div>

                            {/* Primary action footer */}
                            <div className="border-t p-3 mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={() => onEdit(connector)}
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Configure
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
