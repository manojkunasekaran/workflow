import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, ExternalLink, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { integrationApi } from '@/api/integrationApi';
import type { UseCaseInsightsDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { downloadBlob } from '@/features/integrations/lib/downloadBlob';
import {
    formatInsightTimestamp,
    useCaseDisplayLabel,
} from '@/features/integrations/lib/useCaseInsightsFormatters';
import { InsightsMetricsOverview } from './insights/InsightsMetricsOverview';
import { InsightsPanelSkeleton } from './insights/InsightsPanelSkeleton';
import { RetryFailedInsightsConfirmDescription } from './RetryFailedInsightsConfirmDescription';

interface UseCaseInsightsSheetProps {
    integrationId: string;
    workflowDefinitionId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Refresh integration-level insights after retry or when metrics may have changed. */
    onIntegrationInsightsRefresh?: () => void;
}

export function UseCaseInsightsSheet({
    integrationId,
    workflowDefinitionId,
    open,
    onOpenChange,
    onIntegrationInsightsRefresh,
}: UseCaseInsightsSheetProps) {
    const [detail, setDetail] = useState<UseCaseInsightsDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [retryOpen, setRetryOpen] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const loadDetail = useCallback(async () => {
        if (!integrationId || !workflowDefinitionId) return;
        try {
            setIsLoading(true);
            setError(null);
            const data = await integrationApi.getUseCaseInsights(integrationId, workflowDefinitionId);
            setDetail(data);
        } catch {
            setError("We couldn't load use case insights right now.");
            setDetail(null);
        } finally {
            setIsLoading(false);
        }
    }, [integrationId, workflowDefinitionId]);

    useEffect(() => {
        if (open) {
            void loadDetail();
        } else {
            setDetail(null);
            setError(null);
            setActionMessage(null);
            setActionError(null);
        }
    }, [open, loadDetail]);

    const handleExport = async () => {
        setIsExporting(true);
        setActionError(null);
        try {
            const { blob, filename } = await integrationApi.exportUseCaseInsightsCsv(
                integrationId,
                workflowDefinitionId,
            );
            downloadBlob(blob, filename);
            setActionMessage('Use case insights exported as CSV.');
        } catch {
            setActionError("We couldn't export this use case right now.");
        } finally {
            setIsExporting(false);
        }
    };

    const confirmRetryFailed = async () => {
        setIsRetrying(true);
        setActionError(null);
        try {
            const result = await integrationApi.retryFailedExecutions(
                integrationId,
                workflowDefinitionId,
            );
            if (result.queuedCount === 0 && result.eligibleFailedExecutions === 0) {
                setActionMessage('No failed runs to retry for this use case.');
            } else if (result.queuedCount === 0) {
                setActionError('Failed runs could not be re-queued. Check server logs for details.');
            } else {
                setActionMessage(
                    `Re-queued ${result.queuedCount} failed run${result.queuedCount === 1 ? '' : 's'} for this use case.`,
                );
            }
            await loadDetail();
            onIntegrationInsightsRefresh?.();
        } catch {
            setActionError("We couldn't retry failed runs for this use case right now.");
        } finally {
            setIsRetrying(false);
            setRetryOpen(false);
        }
    };

    const title = detail
        ? useCaseDisplayLabel(detail)
        : 'Use case insights';

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="flex w-full flex-col sm:max-w-xl md:max-w-2xl overflow-y-auto"
                    data-testid="use-case-insights-sheet"
                >
                    <div className="flex items-start justify-between gap-4 pr-8">
                        <SheetHeader className="flex-1 space-y-1 text-left p-0">
                            <SheetTitle className="flex items-center gap-2 leading-tight">
                                <BarChart3 className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <span className="break-words">{title}</span>
                            </SheetTitle>
                            {detail?.useCaseDescription ? (
                                <p className="text-sm text-muted-foreground">{detail.useCaseDescription}</p>
                            ) : null}
                        </SheetHeader>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid="use-case-insights-export"
                                onClick={() => void handleExport()}
                                disabled={isLoading || isExporting || !detail}
                            >
                                {isExporting ? (
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
                                data-testid="use-case-insights-retry-failed"
                                onClick={() => setRetryOpen(true)}
                                disabled={
                                    isLoading
                                    || isRetrying
                                    || !detail
                                    || detail.failedRuns === 0
                                }
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Retry failed
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid="use-case-insights-refresh"
                                onClick={() => void loadDetail()}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="mt-6 space-y-6 flex-1">
                        {actionError ? <ErrorBanner message={actionError} /> : null}
                        {actionMessage ? (
                            <p className="text-sm text-muted-foreground" data-testid="use-case-insights-action-message">
                                {actionMessage}
                            </p>
                        ) : null}

                        {isLoading && !detail ? <InsightsPanelSkeleton /> : null}

                        {error ? (
                            <div className="space-y-3">
                                <ErrorBanner message={error} />
                                <Button variant="outline" size="sm" onClick={() => void loadDetail()}>
                                    Try again
                                </Button>
                            </div>
                        ) : null}

                        {detail && !error ? (
                            <>
                                <InsightsMetricsOverview
                                    compact
                                    testIdPrefix="use-case-insights"
                                    metrics={{
                                        totalRuns: detail.totalRuns,
                                        completedRuns: detail.completedRuns,
                                        failedRuns: detail.failedRuns,
                                        inProgressRuns: detail.inProgressRuns,
                                        lastRunAt: detail.lastRunAt,
                                    }}
                                />

                                <div>
                                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-medium">Recent runs</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Showing the 10 most recent runs only.
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
                                            <Link
                                                to="/executions"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                data-testid="use-case-insights-view-all-executions"
                                            >
                                                View all executions
                                                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                    {detail.recentExecutions.length === 0 ? (
                                        <p
                                            data-testid="use-case-insights-no-runs"
                                            className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg"
                                        >
                                            No runs yet for this use case.
                                        </p>
                                    ) : (
                                        <div className="rounded-md border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Started</TableHead>
                                                        <TableHead className="w-[80px]" />
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {detail.recentExecutions.map((run) => (
                                                        <TableRow key={run.executionId}>
                                                            <TableCell>
                                                                <ExecutionStatusBadge status={run.status} size="md" />
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                                {formatInsightTimestamp(run.startTime)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                                                                    <Link
                                                                        to={`/executions/${run.executionId}`}
                                                                        data-testid={`use-case-insights-exec-link-${run.executionId}`}
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={retryOpen}
                onOpenChange={(next) => !next && !isRetrying && setRetryOpen(next)}
                elevated
                title="Retry failed runs for this use case?"
                description={
                    <RetryFailedInsightsConfirmDescription
                        scope="use-case"
                        failedCount={detail?.failedRuns ?? 0}
                    />
                }
                confirmLabel="Yes, retry failed runs"
                cancelLabel="Cancel"
                isConfirming={isRetrying}
                onConfirm={confirmRetryFailed}
            />
        </>
    );
}
