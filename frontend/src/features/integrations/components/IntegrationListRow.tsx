import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Integration } from '@/types/api';
import { ConnectorIconDisplay } from './ConnectorIconDisplay';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface IntegrationListRowProps {
    integration: Integration;
    onClick: () => void;
}

export function IntegrationListRow({ integration, onClick }: IntegrationListRowProps) {
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
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
        >
            <div className="w-[120px] shrink-0 flex items-center gap-2">
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
            
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium leading-tight">{integration.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {integration.description}
                </p>
            </div>
            
            <div className="flex items-center shrink-0">
                <div className="w-[80px]">
                    <StatusBadge className={cn("border-none", getScopeColor(integration.scope))}>
                        {integration.scope}
                    </StatusBadge>
                </div>
                <div className="w-[90px]">
                    <StatusBadge className={cn("border-none", getStatusColor(integration.status))}>
                        {integration.status}
                    </StatusBadge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
            </div>
        </div>
    );
}
