import { useState } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import { ConnectionsList } from '@/features/settings/components/ConnectionsList';
import { CredentialsList } from '@/features/settings/components/CredentialsList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Link2, KeyRound } from 'lucide-react';

export default function CredentialsPage() {
    const [activeTab, setActiveTab] = useState<'connections' | 'custom'>('connections');

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h1 data-testid="credentials-page-heading" className="text-sm font-semibold">
                            Credentials
                        </h1>
                    </div>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Credentials & Connections</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage authenticated connections to third-party apps and store standalone secrets.
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'connections' | 'custom')}>
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="connections" className="flex items-center gap-2">
                                <Link2 className="h-4 w-4" />
                                <span>Connections</span>
                            </TabsTrigger>
                            <TabsTrigger value="custom" className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4" />
                                <span>Custom Credentials</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="connections" className="mt-6">
                            <ConnectionsList />
                        </TabsContent>

                        <TabsContent value="custom" className="mt-6">
                            <CredentialsList />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
