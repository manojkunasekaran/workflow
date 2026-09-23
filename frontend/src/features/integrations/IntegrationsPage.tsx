import { PageHeader } from '@/layouts/PageHeader';
import ConnectorsPage from '@/features/settings/connectors/ConnectorsPage';
import { Blocks } from 'lucide-react';

export default function IntegrationsPage() {
    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <div className="flex items-center gap-2">
                        <Blocks className="h-4 w-4 text-muted-foreground" />
                        <h1 data-testid="integrations-page-heading" className="text-sm font-semibold">
                            Apps
                        </h1>
                    </div>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <ConnectorsPage scope="TENANT" />
            </div>
        </div>
    );
}
