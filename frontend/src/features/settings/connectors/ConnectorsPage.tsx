import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import ConnectorList, { type ConnectorListHandle } from './ConnectorList';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';

interface ConnectorsPageProps {
    scope?: 'SYSTEM' | 'TENANT';
}

export default function ConnectorsPage({ scope }: ConnectorsPageProps) {
    const navigate = useNavigate();
    const listRef = useRef<ConnectorListHandle>(null);

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <h1 data-testid="integrations-page-heading" className="text-sm font-semibold">
                        Apps
                    </h1>
                }
                actions={
                    <>
                        <Button
                            data-testid="refresh-connectors-btn"
                            variant="outline"
                            size="sm"
                            onClick={() => void listRef.current?.refresh()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Button
                            data-testid="new-connector-btn-header"
                            size="sm"
                            onClick={() => navigate('/apps/new')}
                        >
                            <Plus className="h-4 w-4" />
                            New App
                        </Button>
                    </>
                }
            />

            <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
                <ConnectorList ref={listRef} scope={scope} />
            </div>
        </div>
    );
}
