import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TableVirtuoso, type TableComponents } from 'react-virtuoso';
import { executionApi, type WorkflowExecution } from '@/api/executionApi';
import { workflowApi } from '@/api/workflowApi';
import type { WorkflowDefinition, WorkflowTask } from '@/types/api';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Hint } from '@/components/ui/hint';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import {
    formatExecutionDuration,
    formatExecutionTimestamp,
} from '@/features/executions/lib/executionDisplay';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { taskTypeLabel } from '@/features/workflow-studio/lib/taskDisplayName';

const PAGE_SIZE = 30;

function createVirtuosoTableComponents(
    onRowClick: (execution: WorkflowExecution) => void,
): TableComponents<WorkflowExecution> {
    return {
        Table: ({ style, children }) => (
            <table style={style} className="w-full table-fixed border-separate border-spacing-0">
                {children}
            </table>
        ),
        TableRow: ({ item, children, ...props }) => (
            <tr
                {...props}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => onRowClick(item)}
            >
                {children}
            </tr>
        ),
    };
}

function findFailedStepId(execution: WorkflowExecution): string | null {
    const failed = execution.taskExecutionSummaries?.find(
        (summary) => summary.status.toUpperCase() === 'FAILED',
    );
    return failed?.taskDefinitionId ?? null;
}

function executionDefinitionId(execution: WorkflowExecution): string {
    return execution.workflowId;
}

function resolveWorkflowName(
    execution: WorkflowExecution,
    definitions: Record<string, WorkflowDefinition>,
    failedDefinitionIds: Set<string>,
) {
    const definitionId = executionDefinitionId(execution);
    const definition = definitions[definitionId];

    if (definition?.name) {
        return <span>{definition.name}</span>;
    }

    if (failedDefinitionIds.has(definitionId)) {
        return <span className="text-muted-foreground">Workflow unavailable</span>;
    }

    return <Skeleton className="h-4 w-40" aria-label="Loading workflow name" />;
}

function resolveTaskDisplayName(definition: WorkflowDefinition | undefined, taskId: string): string | null {
    if (!definition) return null;

    const task = definition.tasks.find((item) => item.taskId === taskId);
    if (!task) return null;

    const layoutName = definition.layout?.[taskId]?.displayName?.trim();
    if (layoutName) return layoutName;

    const parameterName = String(task.parameters?.displayName ?? '').trim();
    if (parameterName) return parameterName;

    return taskTypeLabel(task.type);
}

function primaryStepId(execution: WorkflowExecution): string | null {
    const status = execution.status.toUpperCase();

    if (status === 'FAILED') {
        return findFailedStepId(execution);
    }

    if (status === 'RUNNING' || status === 'PAUSED') {
        return execution.currentTaskId ?? execution.nextTaskId ?? null;
    }

    return null;
}

function renderStepLabel(
    execution: WorkflowExecution,
    definitions: Record<string, WorkflowDefinition>,
    failedDefinitionIds: Set<string>,
) {
    const status = execution.status.toUpperCase();
    const stepId = primaryStepId(execution);

    if (!stepId) {
        if (status === 'COMPLETED' || status === 'SUCCESS') return 'Completed';
        if (status === 'QUEUED' || status === 'PENDING') return 'Waiting to start';
        return '—';
    }

    const definitionId = executionDefinitionId(execution);
    const displayName = resolveTaskDisplayName(definitions[definitionId], stepId);

    if (displayName) {
        return (
            <span className={status === 'FAILED' ? 'text-destructive' : undefined}>
                {displayName}
            </span>
        );
    }

    if (failedDefinitionIds.has(definitionId)) {
        return <span className="text-muted-foreground">Step unavailable</span>;
    }

    return <Skeleton className="h-4 w-32" aria-label="Loading step name" />;
}

function renderProgress(
    execution: WorkflowExecution,
    definitions: Record<string, WorkflowDefinition>,
    failedDefinitionIds: Set<string>,
) {
    const definitionId = executionDefinitionId(execution);
    const definition = definitions[definitionId];
    const completed = execution.taskExecutionSummaries?.filter(
        (summary) => summary.status.toUpperCase() === 'COMPLETED',
    ).length ?? 0;

    if (!definition) {
        if (failedDefinitionIds.has(definitionId)) {
            return <span className="text-muted-foreground">Unavailable</span>;
        }
        return <Skeleton className="h-4 w-16" aria-label="Loading execution progress" />;
    }

    const total = definition.tasks.filter((task: WorkflowTask) => !task.isTool).length;
    if (total === 0) return '—';

    return `${Math.min(completed, total)} / ${total}`;
}

function triggerLabel(execution: WorkflowExecution): string {
    if (execution.targetTaskId) return 'Test';
    const triggeredBy = (execution.triggeredBy ?? 'MANUAL').toUpperCase();
    if (triggeredBy === 'POLL') return 'Poll';
    if (triggeredBy === 'WEBHOOK') return 'Webhook';
    if (triggeredBy === 'WEBHOOK_SUBSCRIBE') return 'App registers';
    return triggeredBy.charAt(0).toUpperCase() + triggeredBy.slice(1).toLowerCase();
}

export default function ExecutionsList() {
    const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
    const [definitions, setDefinitions] = useState<Record<string, WorkflowDefinition>>({});
    const [loadingDefinitionIds, setLoadingDefinitionIds] = useState<Set<string>>(() => new Set());
    const [failedDefinitionIds, setFailedDefinitionIds] = useState<Set<string>>(() => new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextPageError, setNextPageError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const navigate = useNavigate();

    const loadExecutions = useCallback(async (pageNumber = 0, mode: 'replace' | 'append' = 'replace') => {
        try {
            if (mode === 'replace') {
                setIsLoading(true);
                setError(null);
                setNextPageError(null);
            } else {
                setIsLoadingNextPage(true);
                setNextPageError(null);
            }

            const executionPage = await executionApi.getPage({
                page: pageNumber,
                size: PAGE_SIZE,
                sort: 'startTime,desc',
            });

            setExecutions((current) =>
                mode === 'replace'
                    ? executionPage.content
                    : [...current, ...executionPage.content],
            );
            setPage(executionPage.number);
            setTotalPages(executionPage.totalPages);
        } catch (err) {
            console.error('Failed to load executions', err);
            if (mode === 'replace') {
                setExecutions([]);
                setError("We couldn't load executions right now.");
            } else {
                setNextPageError('Could not load more executions');
            }
        } finally {
            setIsLoading(false);
            setIsLoadingNextPage(false);
        }
    }, []);

    useEffect(() => {
        void loadExecutions();
    }, [loadExecutions]);

    useEffect(() => {
        const missingDefinitionIds = Array.from(
            new Set(executions.map(executionDefinitionId)),
        ).filter(
            (definitionId) =>
                definitionId
                && !definitions[definitionId]
                && !loadingDefinitionIds.has(definitionId)
                && !failedDefinitionIds.has(definitionId),
        );

        if (missingDefinitionIds.length === 0) return;

        setLoadingDefinitionIds((current) => {
            const next = new Set(current);
            missingDefinitionIds.forEach((definitionId) => next.add(definitionId));
            return next;
        });

        void Promise.allSettled(
            missingDefinitionIds.map(async (definitionId) => {
                const definition = await workflowApi.getById(definitionId);
                return { definitionId, definition };
            }),
        ).then((results) => {
            setDefinitions((current) => {
                const next = { ...current };
                results.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        next[result.value.definitionId] = result.value.definition;
                    }
                });
                return next;
            });

            setFailedDefinitionIds((current) => {
                const next = new Set(current);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        next.add(missingDefinitionIds[index]);
                    }
                });
                return next;
            });

            setLoadingDefinitionIds((current) => {
                const next = new Set(current);
                missingDefinitionIds.forEach((definitionId) => next.delete(definitionId));
                return next;
            });
        });
    }, [definitions, executions, failedDefinitionIds, loadingDefinitionIds]);

    const sortedExecutions = useMemo(
        () => [...executions],
        [executions],
    );

    const virtuosoTableComponents = useMemo(
        () => createVirtuosoTableComponents((execution) => navigate(`/executions/${execution.id}`)),
        [navigate],
    );

    const hasMore = totalPages === 0 ? false : page < totalPages - 1;

    const loadMore = useCallback(() => {
        if (isLoading || isLoadingNextPage || !hasMore) return;
        void loadExecutions(page + 1, 'append');
    }, [hasMore, isLoading, isLoadingNextPage, loadExecutions, page]);

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader title={<h1 className="text-sm font-semibold">Executions</h1>} />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 data-testid="executions-list-heading" className="text-sm font-semibold">Executions</h1>}
                actions={
                    <Button data-testid="refresh-executions-btn" variant="outline" size="sm" onClick={() => void loadExecutions()}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col overflow-hidden p-6">
                {error ? (
                    <ErrorBanner
                        data-testid="executions-error-banner"
                        message={error}
                        className="mb-4 shrink-0"
                    />
                ) : null}

                {sortedExecutions.length === 0 && !error ? (
                    <div data-testid="executions-empty-state" className="py-12 text-center text-muted-foreground">
                        No executions found. Run a workflow to see executions here.
                    </div>
                ) : sortedExecutions.length > 0 ? (
                    <div data-testid="executions-table-container" className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-card">
                        <TableVirtuoso
                            data={sortedExecutions}
                            endReached={loadMore}
                            overscan={360}
                            style={{ height: '100%' }}
                            components={virtuosoTableComponents}
                            fixedHeaderContent={() => (
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="w-[24%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Workflow
                                    </th>
                                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Trigger
                                    </th>
                                    <th className="w-[9%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Progress
                                    </th>
                                    <th className="w-[15%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Started
                                    </th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Duration
                                    </th>
                                    <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Current / Failed Step
                                    </th>
                                    <th className="w-[4%] px-4 py-3" />
                                </tr>
                            )}
                            fixedFooterContent={() => (
                                isLoadingNextPage || nextPageError ? (
                                    <tr>
                                        <td colSpan={8} className="border-t border-border bg-card px-4 py-4">
                                            {isLoadingNextPage ? (
                                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading more executions
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-3 text-sm text-destructive">
                                                    <span>{nextPageError}</span>
                                                    <Button variant="outline" size="sm" onClick={loadMore}>
                                                        Retry
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ) : null
                            )}
                            itemContent={(_, execution) => {
                                const duration = formatExecutionDuration(
                                    execution.startTime,
                                    execution.endTime,
                                );

                                return (
                                    <>
                                        <td
                                            data-testid={`execution-row-${execution.id}`}
                                            className="border-b border-border px-4 py-3"
                                        >
                                            <div
                                                data-testid={`execution-workflow-name-${execution.id}`}
                                                className="min-w-0 text-sm font-medium text-foreground"
                                            >
                                                {resolveWorkflowName(execution, definitions, failedDefinitionIds)}
                                            </div>
                                        </td>
                                        <td
                                            data-testid={`execution-status-cell-${execution.id}`}
                                            className="border-b border-border px-4 py-3"
                                        >
                                            <ExecutionStatusBadge status={execution.status} size="lg" />
                                        </td>
                                        <td className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
                                            {triggerLabel(execution)}
                                        </td>
                                        <td className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
                                            {renderProgress(execution, definitions, failedDefinitionIds)}
                                        </td>
                                        <td
                                            data-testid={`execution-timestamp-${execution.id}`}
                                            className="border-b border-border px-4 py-3 text-sm text-muted-foreground"
                                        >
                                            {formatExecutionTimestamp(execution.startTime)}
                                        </td>
                                        <td
                                            data-testid={`execution-duration-${execution.id}`}
                                            className="border-b border-border px-4 py-3 text-sm text-muted-foreground"
                                        >
                                            {duration}
                                        </td>
                                        <td
                                            data-testid={`execution-failed-step-${execution.id}`}
                                            className="border-b border-border px-4 py-3 text-sm text-muted-foreground"
                                        >
                                            <div className="truncate">
                                                {renderStepLabel(execution, definitions, failedDefinitionIds)}
                                            </div>
                                        </td>
                                        <td
                                            className="border-b border-border px-4 py-3"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                <Hint content="View execution details">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'hover:bg-muted hover:text-foreground',
                                                        )}
                                                    >
                                                        <Link
                                                            data-testid={`open-execution-link-${execution.id}`}
                                                            to={`/executions/${execution.id}`}
                                                        >
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </Hint>
                                            </div>
                                        </td>
                                    </>
                                );
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
