import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { integrationApi } from '@/api/integrationApi';
import type { Integration, UseCase } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/layouts/PageHeader';
import { PageBreadcrumb } from '@/layouts/PageBreadcrumb';
import { ArrowRight, Puzzle, Loader2, Plus, Pencil } from 'lucide-react';
import { ConnectorIconDisplay } from './components/ConnectorIconDisplay';
import { UseCaseCard } from './components/UseCaseCard';
import { AddUseCaseDialog } from './components/AddUseCaseDialog';
import { EditIntegrationDialog } from './components/EditIntegrationDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

export default function IntegrationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addUseCaseOpen, setAddUseCaseOpen] = useState(false);
    const [editIntegrationOpen, setEditIntegrationOpen] = useState(false);
    const [useCaseToRemove, setUseCaseToRemove] = useState<UseCase | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const loadData = async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const [intData, ucData] = await Promise.all([
                integrationApi.getIntegration(id),
                integrationApi.listUseCases(id)
            ]);
            setIntegration(intData);
            setUseCases(ucData);
        } catch (err) {
            setError("We couldn't load integration details right now.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handlePublish = async () => {
        if (!id) return;
        try {
            await integrationApi.publishIntegration(id);
            await loadData();
        } catch (err) {
            // failed to publish
        }
    };

    const handleDeprecate = async () => {
        if (!id) return;
        try {
            await integrationApi.deprecateIntegration(id);
            await loadData();
        } catch (err) {
            // failed to deprecate
        }
    };

    const handleViewUseCase = (useCase: UseCase) => {
        // TODO: Replace with credential-binding flow
        navigate(`/workflows/${useCase.id}`);
    };

    const handleRemoveUseCase = (useCase: UseCase) => {
        setUseCaseToRemove(useCase);
    };

    const confirmRemoveUseCase = async () => {
        if (!id || !useCaseToRemove) return;
        setIsRemoving(true);
        try {
            await integrationApi.removeUseCase(id, useCaseToRemove.id);
            await loadData();
            setUseCaseToRemove(null);
        } catch (err) {
            console.error('Failed to remove use case', err);
        } finally {
            setIsRemoving(false);
        }
    };

    const handleNavigateBack = (e?: React.MouseEvent) => {
        e?.preventDefault();
        navigate('/integrations');
    };

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader
                    title={
                        <PageBreadcrumb
                            items={[
                                { label: 'Integrations', href: '/integrations', onNavigate: handleNavigateBack },
                                { label: 'Loading...' },
                            ]}
                        />
                    }
                />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !integration) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader
                    title={
                        <PageBreadcrumb
                            items={[
                                { label: 'Integrations', href: '/integrations', onNavigate: handleNavigateBack },
                                { label: 'Error' },
                            ]}
                        />
                    }
                />
                <div className="flex-1 overflow-auto p-6">
                    {error ? <ErrorBanner message={error} /> : <ErrorBanner message="Integration not found." />}
                    <Button variant="outline" className="mt-4" onClick={handleNavigateBack}>
                        Back to Integrations
                    </Button>
                </div>
            </div>
        );
    }

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
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <PageBreadcrumb
                        items={[
                            { label: 'Integrations', href: '/integrations', onNavigate: handleNavigateBack },
                            { label: integration.name },
                        ]}
                    />
                }
                actions={
                    <>
                        {integration.status === 'DRAFT' && (
                            <Button size="sm" onClick={handlePublish}>Publish</Button>
                        )}
                        {integration.status === 'PUBLISHED' && (
                            <Button size="sm" variant="outline" onClick={handleDeprecate}>Deprecate</Button>
                        )}
                    </>
                }
            />
            
            <div className="flex-1 overflow-auto p-6 space-y-8">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <ConnectorIconDisplay icon={integration.sourceConnectorIcon} name={integration.sourceConnectorName || ''} size="md" />
                                <ArrowRight className="text-muted-foreground" />
                                <ConnectorIconDisplay icon={integration.destinationConnectorIcon} name={integration.destinationConnectorName || ''} size="md" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{integration.name}</h1>
                                {integration.description && <p className="text-muted-foreground text-sm mt-1">{integration.description}</p>}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <StatusBadge className={cn("border-none", getScopeColor(integration.scope))}>
                                        {integration.scope}
                                    </StatusBadge>
                                    <StatusBadge className={cn("border-none", getStatusColor(integration.status))}>
                                        {integration.status}
                                    </StatusBadge>
                                    {integration.tags.map(tag => (
                                        <StatusBadge key={tag} className="border-none bg-secondary text-secondary-foreground">{tag}</StatusBadge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditIntegrationOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </div>
                </div>
                
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Use Cases ({useCases.length})</h2>
                        <Button size="sm" variant="outline" onClick={() => setAddUseCaseOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Use Case
                        </Button>
                    </div>
                    <div className="grid gap-2">
                        {useCases.map(uc => <UseCaseCard key={uc.id} useCase={uc} onView={handleViewUseCase} onRemove={handleRemoveUseCase} />)}
                    </div>
                    {useCases.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-lg text-center bg-muted/20 text-muted-foreground">
                            <Puzzle className="h-10 w-10 opacity-20 mb-3" />
                            <p className="text-sm">No use cases yet. Assign a workflow from the Workflow Studio.</p>
                        </div>
                    )}
                </div>
            </div>

            <AddUseCaseDialog
                open={addUseCaseOpen}
                onClose={() => setAddUseCaseOpen(false)}
                integrationId={id ?? ''}
                onAdded={() => { void loadData(); }}
            />

            <ConfirmDialog
                open={!!useCaseToRemove}
                onOpenChange={(open) => !open && setUseCaseToRemove(null)}
                title="Remove Use Case"
                description={`Are you sure you want to remove "${useCaseToRemove?.useCaseTitle || useCaseToRemove?.name}" from this integration?`}
                confirmLabel="Remove"
                destructive={true}
                isConfirming={isRemoving}
                onConfirm={confirmRemoveUseCase}
            />

            {integration && (
                <EditIntegrationDialog
                    open={editIntegrationOpen}
                    onClose={() => setEditIntegrationOpen(false)}
                    integration={integration}
                    onUpdated={() => { void loadData(); }}
                />
            )}
        </div>
    );
}
