import { useCallback, useEffect, useRef, useState } from 'react';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';

import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { IntegrationList, type IntegrationListHandle } from './components/IntegrationList';
import { CreateIntegrationDialog } from './components/CreateIntegrationDialog';

export default function IntegrationsPage() {
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const listRef = useRef<IntegrationListHandle>(null);

    const loadConnectors = useCallback(async () => {
        try {
            const connectorsData = await connectorApi.list();
            setConnectors(connectorsData);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        loadConnectors();
    }, [loadConnectors]);

    const handleCreated = () => {
        listRef.current?.refresh();
    };

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader 
                title={<h1 className="text-sm font-semibold">Integrations</h1>} 
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => listRef.current?.refresh()}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4" />
                            Create Integration
                        </Button>
                    </>
                } 
            />
            
            <div className="flex-1 overflow-auto p-6">
                <IntegrationList ref={listRef} />
            </div>

            {showCreateDialog && (
                <CreateIntegrationDialog 
                    open={showCreateDialog} 
                    onClose={() => setShowCreateDialog(false)} 
                    onCreated={handleCreated} 
                    connectors={connectors} 
                />
            )}
        </div>
    );
}
