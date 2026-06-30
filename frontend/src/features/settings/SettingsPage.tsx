import { useEffect, useState } from 'react';
import { healthApi, type HealthResponse } from '@/api/healthApi';
import { API_BASE_URL } from '@/api/config';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

function statusClass(status: string) {
    if (status === 'UP') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'DOWN') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
}

export default function SettingsPage() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHealth = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setHealth(await healthApi.getApiHealth());
        } catch (err) {
            console.error('Failed to load API health', err);
            setHealth(null);
            setError('Cannot reach API. Is the backend running on port 8080?');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHealth();
    }, []);

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 className="text-sm font-semibold">Settings</h1>}
                actions={
                    <Button variant="outline" size="sm" onClick={loadHealth} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Refresh
                    </Button>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-2xl space-y-6">
                    <section className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-3">API Connection</h2>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">Base URL</dt>
                                <dd className="font-mono text-xs">{API_BASE_URL}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-3">API Health</h2>
                        {isLoading && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking...
                            </div>
                        )}
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                        {health && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Overall</span>
                                    <span
                                        className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${statusClass(health.status)}`}
                                    >
                                        {health.status}
                                    </span>
                                </div>
                                {health.components && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(health.components).map(([name, component]) => (
                                            <div
                                                key={name}
                                                className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
                                            >
                                                <span className="text-muted-foreground">{name}</span>
                                                <span className={`font-medium ${component.status === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {component.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-2">Backend configuration</h2>
                        <p className="text-sm text-muted-foreground">
                            MongoDB, RabbitMQ, and gRPC are configured in the backend <code className="text-xs">.env</code> file
                            and Docker Compose — not from this UI.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
