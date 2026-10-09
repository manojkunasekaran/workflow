import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react';
import { BarChart3 } from 'lucide-react';
import { integrationApi } from '@/api/integrationApi';
import type { IntegrationInsights } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ViewUseCaseInsightsButton } from './ViewUseCaseInsightsButton';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    formatInsightTimestamp,
    useCaseRowLabel,
} from '@/features/integrations/lib/useCaseInsightsFormatters';
import { InsightsMetricsOverview } from './insights/InsightsMetricsOverview';
import { InsightsPanelSkeleton } from './insights/InsightsPanelSkeleton';
import { InsightsTableSuccessCell } from './insights/InsightsTableSuccessCell';

interface IntegrationInsightsTabProps {
    integrationId: string;
    onLoadingChange?: (loading: boolean) => void;
    onInsightsLoaded?: (insights: IntegrationInsights) => void;
    onViewUseCaseInsights: (workflowDefinitionId: string) => void;
}

export interface IntegrationInsightsTabHandle {
    refresh: () => void;
}

export const IntegrationInsightsTab = forwardRef<
    IntegrationInsightsTabHandle,
    IntegrationInsightsTabProps
>(function IntegrationInsightsTab(
    { integrationId, onLoadingChange, onInsightsLoaded, onViewUseCaseInsights },
    ref,
) {
    const [insights, setInsights] = useState<IntegrationInsights | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInsights = useCallback(async () => {
        try {
            setIsLoading(true);
            onLoadingChange?.(true);
            setError(null);
            const data = await integrationApi.getInsights(integrationId);
            setInsights(data);
            onInsightsLoaded?.(data);
        } catch {
            setError("We couldn't load integration insights right now.");
            setInsights(null);
        } finally {
            setIsLoading(false);
            onLoadingChange?.(false);
        }
    }, [integrationId, onInsightsLoaded, onLoadingChange]);

    useImperativeHandle(ref, () => ({
        refresh: () => {
            void loadInsights();
        },
    }), [loadInsights]);

    useEffect(() => {
        void loadInsights();
    }, [loadInsights]);

    if (isLoading && !insights) {
        return <InsightsPanelSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-4">
                <ErrorBanner message={error} />
                <Button variant="outline" size="sm" onClick={() => void loadInsights()}>
                    Try again
                </Button>
            </div>
        );
    }

    if (!insights) {
        return null;
    }

    const metrics = {
        totalRuns: insights.totalRuns,
        completedRuns: insights.completedRuns,
        failedRuns: insights.failedRuns,
        inProgressRuns: insights.inProgressRuns,
        lastRunAt: insights.lastRunAt,
    };

    return (
        <div className="space-y-6" data-testid="integration-insights-panel">
            <InsightsMetricsOverview
                metrics={metrics}
                useCaseCount={insights.useCaseCount}
                testIdPrefix="integration-insights"
            />

            {insights.useCases.length === 0 ? (
                <div
                    data-testid="integration-insights-empty"
                    className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl text-center bg-muted/20 text-muted-foreground"
                >
                    <BarChart3 className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-sm">No use cases assigned yet. Insights will appear once workflows are linked.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">By use case</h3>
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/30">
                                    <TableHead>Use case</TableHead>
                                    <TableHead className="text-right">Total runs</TableHead>
                                    <TableHead>Success</TableHead>
                                    <TableHead className="text-right">Failed</TableHead>
                                    <TableHead className="text-right">In progress</TableHead>
                                    <TableHead>Last run</TableHead>
                                    <TableHead className="w-[140px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {insights.useCases.map((row) => (
                                    <TableRow
                                        key={row.workflowDefinitionId}
                                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                                        data-testid={`integration-insights-row-${row.workflowDefinitionId}`}
                                        onClick={() => onViewUseCaseInsights(row.workflowDefinitionId)}
                                    >
                                        <TableCell className="font-medium">{useCaseRowLabel(row)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{row.totalRuns}</TableCell>
                                        <TableCell>
                                            <InsightsTableSuccessCell
                                                completedRuns={row.completedRuns}
                                                failedRuns={row.failedRuns}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                                            {row.failedRuns}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-400">
                                            {row.inProgressRuns}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                            {formatInsightTimestamp(row.lastRunAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ViewUseCaseInsightsButton
                                                workflowDefinitionId={row.workflowDefinitionId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewUseCaseInsights(row.workflowDefinitionId);
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
});
