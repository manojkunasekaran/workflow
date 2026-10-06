import { ArrowRight } from 'lucide-react';
import type { Integration } from '@/types/api';
import { ConnectorIconDisplay } from './ConnectorIconDisplay';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
    integration: Integration;
    onClick: () => void;
}

export function IntegrationCard({ integration, onClick }: IntegrationCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300';
            case 'PUBLISHED': return 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300';
            case 'DEPRECATED': return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getScopeColor = (scope: string) => {
        if (scope === 'SYSTEM') return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300';
        return 'bg-secondary text-secondary-foreground';
    };

    return (
        <div 
            onClick={onClick}
            className="flex cursor-pointer flex-col justify-between rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
        >
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <ConnectorIconDisplay 
                        icon={integration.sourceConnectorIcon} 
                        name={integration.sourceConnectorName || 'Source'} 
                        size="md" 
                    />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <ConnectorIconDisplay 
                        icon={integration.destinationConnectorIcon} 
                        name={integration.destinationConnectorName || 'Destination'} 
                        size="md" 
                    />
                </div>
                <div>
                    <h3 className="font-bold text-base leading-tight">{integration.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {integration.description}
                    </p>
                </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t pt-3">
                <div className="flex gap-2">
                    <StatusBadge className={cn("border-none", getScopeColor(integration.scope))}>
                        {integration.scope}
                    </StatusBadge>
                    <StatusBadge className={cn("border-none", getStatusColor(integration.status))}>
                        {integration.status}
                    </StatusBadge>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                    {integration.useCaseCount} use cases
                </span>
            </div>
        </div>
    );
}
