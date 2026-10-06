import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { integrationApi } from '@/api/integrationApi';
import type { Integration } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Puzzle } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { ViewToggle } from '@/components/ui/view-toggle';
import { IntegrationListRow } from './IntegrationListRow';
import { EmptyState } from '@/components/ui/empty-state';
import { LoaderState } from '@/components/ui/loader-state';

export interface IntegrationListProps {
    connectorId?: string;
    hideFilters?: boolean;
}

export interface IntegrationListHandle {
    refresh: () => Promise<void>;
}

export const IntegrationList = forwardRef<IntegrationListHandle, IntegrationListProps>(function IntegrationList({ connectorId, hideFilters }, ref) {
    const navigate = useNavigate();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'system' | 'mine'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const integrationsData = await integrationApi.listIntegrations();
            setIntegrations(integrationsData);
        } catch (err) {
            setError("We couldn't load integrations right now.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useImperativeHandle(ref, () => ({
        refresh: loadData
    }), [loadData]);

    let filtered = integrations
        .filter(i => activeTab === 'all' || (activeTab === 'system' && i.scope === 'SYSTEM') || (activeTab === 'mine' && i.scope === 'USER'))
        .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (connectorId) {
        filtered = filtered.filter(i => i.sourceConnectorId === connectorId || i.destinationConnectorId === connectorId);
    }

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <LoaderState className="py-24" />
            </div>
        );
    }

    if (error) {
        return <ErrorBanner message={error} />;
    }

    return (
        <div className="space-y-4">
            {!hideFilters && (
                <div className="mb-6 flex w-full items-center justify-between">
                    <SearchInput 
                        placeholder="Search integrations..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-72"
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
                                System
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("h-8", activeTab === 'mine' && "bg-background shadow-sm")} 
                                onClick={() => setActiveTab('mine')}
                            >
                                My Integrations
                            </Button>
                        </div>
                        <ViewToggle value={viewMode} onChange={setViewMode} />
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <EmptyState icon={Puzzle} description="No integrations found matching your criteria." />
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(integration => (
                        <IntegrationCard 
                            key={integration.id} 
                            integration={integration} 
                            onClick={() => navigate(`/integrations/${integration.id}`)} 
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border flex flex-col">
                    <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/50">
                        <div className="w-[120px] shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Connector</div>
                        <div className="flex-1 min-w-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</div>
                        <div className="flex items-center pr-6 shrink-0">
                            <div className="w-[80px] text-xs font-medium uppercase tracking-wider text-muted-foreground">Scope</div>
                            <div className="w-[90px] text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</div>
                        </div>
                    </div>
                    {filtered.map(integration => (
                        <IntegrationListRow 
                            key={integration.id} 
                            integration={integration} 
                            onClick={() => navigate(`/integrations/${integration.id}`)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
