import { useState } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ConnectorsPage from '@/features/settings/connectors/ConnectorsPage';
import { Blocks, Globe, Building2 } from 'lucide-react';

export default function IntegrationsPage() {
    const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <div className="flex items-center gap-2">
                        <Blocks className="h-4 w-4 text-primary" />
                        <h1 data-testid="integrations-page-heading" className="text-sm font-semibold">
                            Integrations
                        </h1>
                    </div>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Connector Hub</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse pre-built system integrations or build custom connectors tailored to your workspace.
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'system' | 'custom')}>
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="system" className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span>System Integrations</span>
                            </TabsTrigger>
                            <TabsTrigger value="custom" className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>Custom Connectors</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="system" className="mt-6">
                            <ConnectorsPage scope="SYSTEM" />
                        </TabsContent>

                        <TabsContent value="custom" className="mt-6">
                            <ConnectorsPage scope="TENANT" />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
