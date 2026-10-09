import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { integrationApi } from '@/api/integrationApi';
import type { Integration, IntegrationInsights, UseCase } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/layouts/PageHeader';
import { PageBreadcrumb } from '@/layouts/PageBreadcrumb';
import { ArrowRight, Puzzle, Loader2, Plus, Pencil, RefreshCw, Download, RotateCcw } from 'lucide-react';
import { downloadBlob } from '@/features/integrations/lib/downloadBlob';
import { ConnectorIconDisplay } from './components/ConnectorIconDisplay';
import { UseCaseCard } from './components/UseCaseCard';
import { AddUseCaseDialog } from './components/AddUseCaseDialog';
import { EditIntegrationDialog } from './components/EditIntegrationDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    IntegrationInsightsTab,
    type IntegrationInsightsTabHandle,
} from './components/IntegrationInsightsTab';
import { UseCaseInsightsSheet } from './components/UseCaseInsightsSheet';
import { RetryFailedInsightsConfirmDescription } from './components/RetryFailedInsightsConfirmDescription';
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
    const [activeTab, setActiveTab] = useState('use-cases');
    const [insightsLoading, setInsightsLoading] = useState(false);
    const insightsTabRef = useRef<IntegrationInsightsTabHandle>(null);
    const [useCaseInsightsOpen, setUseCaseInsightsOpen] = useState(false);
    const [useCaseInsightsWorkflowId, setUseCaseInsightsWorkflowId] = useState<string | null>(null);
    const [insightsSnapshot, setInsightsSnapshot] = useState<IntegrationInsights | null>(null);
    const [isExportingInsights, setIsExportingInsights] = useState(false);
    const [retryFailedOpen, setRetryFailedOpen] = useState(false);
    const [isRetryingFailed, setIsRetryingFailed] = useState(false);
    const [insightsActionMessage, setInsightsActionMessage] = useState<string | null>(null);
    const [insightsActionError, setInsightsActionError] = useState<string | null>(null);

    const openUseCaseInsights = (workflowDefinitionId: string) => {
        setUseCaseInsightsWorkflowId(workflowDefinitionId);
        setUseCaseInsightsOpen(true);
    };

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

    const handleExportInsights = async () => {
        if (!id) return;
        setIsExportingInsights(true);
        setInsightsActionError(null);
        try {
            const { blob, filename } = await integrationApi.exportInsightsCsv(id);
            downloadBlob(blob, filename);
            setInsightsActionMessage('Insights exported as CSV.');
        } catch {
            setInsightsActionError("We couldn't export insights right now.");
        } finally {
            setIsExportingInsights(false);
        }
    };

    const confirmRetryFailedExecutions = async () => {
        if (!id) return;
        setIsRetryingFailed(true);
        setInsightsActionError(null);
        try {
            const result = await integrationApi.retryFailedExecutions(id);
            if (result.queuedCount === 0 && result.eligibleFailedExecutions === 0) {
                setInsightsActionMessage('No failed runs to retry.');
            } else if (result.queuedCount === 0) {
                setInsightsActionError('Failed runs could not be re-queued. Check server logs for details.');
            } else {
                setInsightsActionMessage(
                    `Re-queued ${result.queuedCount} failed run${result.queuedCount === 1 ? '' : 's'}.`,
                );
            }
            insightsTabRef.current?.refresh();
        } catch {
            setInsightsActionError("We couldn't retry failed runs right now.");
        } finally {
            setIsRetryingFailed(false);
            setRetryFailedOpen(false);
        }
    };

    const handleInsightsLoaded = useCallback((data: IntegrationInsights) => {
        setInsightsSnapshot(data);
        setInsightsActionMessage(null);
    }, []);

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
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <TabsList>
                            <TabsTrigger value="use-cases" data-testid="integration-tab-use-cases">
                                Use Cases ({useCases.length})
                            </TabsTrigger>
                            <TabsTrigger value="insights" data-testid="integration-tab-insights">
                                Insights
                            </TabsTrigger>
                        </TabsList>
                        {activeTab === 'use-cases' ? (
                            <Button
                                size="sm"
                                variant="outline"
                                data-testid="integration-add-use-case-btn"
                                onClick={() => setAddUseCaseOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Use Case
                            </Button>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    data-testid="integration-insights-export"
                                    onClick={() => void handleExportInsights()}
                                    disabled={isExportingInsights || insightsLoading}
                                >
                                    {isExportingInsights ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Export
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    data-testid="integration-insights-retry-failed"
                                    onClick={() => setRetryFailedOpen(true)}
                                    disabled={
                                        insightsLoading
                                        || isRetryingFailed
                                        || insightsSnapshot == null
                                        || insightsSnapshot.failedRuns === 0
                                    }
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Retry failed
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    data-testid="integration-insights-refresh"
                                    onClick={() => insightsTabRef.current?.refresh()}
                                    disabled={insightsLoading}
                                >
                                    {insightsLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Refresh
                                </Button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="use-cases">
                        <div>
                            <div className="grid gap-2">
                                {useCases.map(uc => (
                                    <UseCaseCard
                                        key={uc.id}
                                        useCase={uc}
                                        onView={handleViewUseCase}
                                        onViewInsights={() => openUseCaseInsights(uc.id)}
                                        onRemove={handleRemoveUseCase}
                                    />
                                ))}
                            </div>
                            {useCases.length === 0 && !isLoading && (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-lg text-center bg-muted/20 text-muted-foreground">
                                    <Puzzle className="h-10 w-10 opacity-20 mb-3" />
                                    <p className="text-sm">No use cases yet. Assign a workflow from the Workflow Studio.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="insights">
                        {insightsActionError ? (
                            <div className="mb-4">
                                <ErrorBanner message={insightsActionError} />
                            </div>
                        ) : null}
                        {insightsActionMessage ? (
                            <p
                                className="mb-4 text-sm text-muted-foreground"
                                data-testid="integration-insights-action-message"
                            >
                                {insightsActionMessage}
                            </p>
                        ) : null}
                        {id ? (
                            <IntegrationInsightsTab
                                ref={insightsTabRef}
                                integrationId={id}
                                onLoadingChange={setInsightsLoading}
                                onInsightsLoaded={handleInsightsLoaded}
                                onViewUseCaseInsights={openUseCaseInsights}
                            />
                        ) : null}
                    </TabsContent>
                </Tabs>
            </div>

            {id && useCaseInsightsWorkflowId ? (
                <UseCaseInsightsSheet
                    integrationId={id}
                    workflowDefinitionId={useCaseInsightsWorkflowId}
                    open={useCaseInsightsOpen}
                    onOpenChange={setUseCaseInsightsOpen}
                    onIntegrationInsightsRefresh={() => insightsTabRef.current?.refresh()}
                />
            ) : null}

            <AddUseCaseDialog
                open={addUseCaseOpen}
                onClose={() => setAddUseCaseOpen(false)}
                integrationId={id ?? ''}
                onAdded={() => { void loadData(); }}
            />

            <ConfirmDialog
                open={retryFailedOpen}
                onOpenChange={(open) => !open && !isRetryingFailed && setRetryFailedOpen(open)}
                title="Retry failed runs?"
                description={
                    <RetryFailedInsightsConfirmDescription
                        scope="integration"
                        failedCount={insightsSnapshot?.failedRuns ?? 0}
                    />
                }
                confirmLabel="Yes, retry failed runs"
                cancelLabel="Cancel"
                isConfirming={isRetryingFailed}
                onConfirm={confirmRetryFailedExecutions}
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
