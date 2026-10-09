import { Pencil } from 'lucide-react';
import type { ConnectorManifest } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConnectorIconDisplay } from '@/features/integrations/components/ConnectorIconDisplay';
import { CONNECTOR_AUTH_LABELS } from './connectorFormShared';
import { cn } from '@/lib/utils';

export interface ConnectorGeneralInfoCardProps {
    connector: ConnectorManifest;
    onEdit: () => void;
}

export function ConnectorGeneralInfoCard({ connector, onEdit }: ConnectorGeneralInfoCardProps) {
    const scopeLabel = connector.scope === 'SYSTEM' ? 'Official' : 'Custom';
    const scopeClass =
        connector.scope === 'SYSTEM'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-secondary text-secondary-foreground';

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                    <ConnectorIconDisplay icon={connector.icon} name={connector.displayName} size="md" />
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold">{connector.displayName || 'Untitled app'}</h1>
                        <p className="text-sm text-muted-foreground font-mono mt-1 truncate">
                            {connector.baseUrl || 'No base URL configured'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <StatusBadge className={cn('border-none', scopeClass)}>{scopeLabel}</StatusBadge>
                            {connector.category ? (
                                <StatusBadge className="border-none bg-secondary text-secondary-foreground">
                                    {connector.category}
                                </StatusBadge>
                            ) : null}
                            <StatusBadge className="border-none bg-muted text-muted-foreground">
                                {CONNECTOR_AUTH_LABELS[connector.authType] ?? connector.authType}
                            </StatusBadge>
                        </div>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={onEdit}
                    data-testid="connector-edit-btn"
                >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                </Button>
            </div>
        </div>
    );
}
