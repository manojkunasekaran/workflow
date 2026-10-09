import { statusSegmentPercents, type InsightsRunMetrics } from '@/features/integrations/lib/insightsDashboardUtils';

interface InsightsRunStatusStripProps {
    metrics: InsightsRunMetrics;
    testId?: string;
}

export function InsightsRunStatusStrip({ metrics, testId }: InsightsRunStatusStripProps) {
    const segments = statusSegmentPercents(metrics);

    if (metrics.totalRuns === 0) {
        return (
            <div
                data-testid={testId}
                className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
            >
                No runs recorded yet.
            </div>
        );
    }

    return (
        <div
            data-testid={testId}
            className="rounded-xl border bg-card/80 px-4 py-3 shadow-sm space-y-3"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Run composition
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                    {metrics.totalRuns} total
                </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
                {segments.completed > 0 ? (
                    <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${segments.completed}%` }}
                        title={`Completed: ${metrics.completedRuns}`}
                    />
                ) : null}
                {segments.failed > 0 ? (
                    <div
                        className="h-full bg-red-500"
                        style={{ width: `${segments.failed}%` }}
                        title={`Failed: ${metrics.failedRuns}`}
                    />
                ) : null}
                {segments.inProgress > 0 ? (
                    <div
                        className="h-full bg-amber-400 dark:bg-amber-500"
                        style={{ width: `${segments.inProgress}%` }}
                        title={`In progress: ${metrics.inProgressRuns}`}
                    />
                ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Completed{' '}
                    <span className="font-medium tabular-nums text-foreground">{metrics.completedRuns}</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Failed{' '}
                    <span className="font-medium tabular-nums text-foreground">{metrics.failedRuns}</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                    In progress{' '}
                    <span className="font-medium tabular-nums text-foreground">{metrics.inProgressRuns}</span>
                </span>
            </div>
        </div>
    );
}
