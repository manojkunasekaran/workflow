import { Activity, Layers, TrendingUp, XCircle } from 'lucide-react';
import { InsightsKpiCard } from './InsightsKpiCard';
import { InsightsSuccessRateBar } from './InsightsSuccessRateBar';
import { InsightsRunStatusStrip } from './InsightsRunStatusStrip';
import { InsightsActivityChips } from './InsightsActivityChips';
import { formatInsightSuccessRate } from '@/features/integrations/lib/useCaseInsightsFormatters';
import type { InsightsRunMetrics } from '@/features/integrations/lib/insightsDashboardUtils';
import { cn } from '@/lib/utils';

interface InsightsMetricsOverviewProps {
    metrics: InsightsRunMetrics;
    useCaseCount?: number;
    testIdPrefix?: string;
    compact?: boolean;
}

export function InsightsMetricsOverview({
    metrics,
    useCaseCount,
    testIdPrefix = 'insights',
    compact = false,
}: InsightsMetricsOverviewProps) {
    const successLabel = formatInsightSuccessRate(metrics.completedRuns, metrics.failedRuns);
    const showUseCases = useCaseCount !== undefined;

    return (
        <div className={cn('space-y-4', compact && 'space-y-3')}>
            <div
                className={cn(
                    'grid gap-3',
                    compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4',
                )}
            >
                <InsightsKpiCard
                    testId={`${testIdPrefix}-total-runs`}
                    label="Total runs"
                    value={metrics.totalRuns}
                    subtitle={compact ? undefined : 'Production runs only'}
                    icon={Activity}
                    variant="neutral"
                    emphasized={!compact}
                />

                <div
                    className={cn(
                        'rounded-xl border border-emerald-200/80 bg-emerald-50/35 dark:border-emerald-900/55 dark:bg-emerald-950/25',
                        'p-4 flex flex-col gap-3 border-l-4 border-l-emerald-500',
                        !compact && 'lg:col-span-1',
                    )}
                >
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Success rate
                        </span>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <span
                        data-testid={`${testIdPrefix}-success-rate`}
                        className="text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-300"
                    >
                        {successLabel}
                    </span>
                    <InsightsSuccessRateBar
                        completedRuns={metrics.completedRuns}
                        failedRuns={metrics.failedRuns}
                        showLabel={false}
                        testId={`${testIdPrefix}-success-bar`}
                    />
                </div>

                <InsightsKpiCard
                    testId={`${testIdPrefix}-failed-runs`}
                    label="Failed runs"
                    value={metrics.failedRuns}
                    subtitle={metrics.failedRuns > 0 ? 'Needs attention' : 'None recorded'}
                    icon={XCircle}
                    variant={metrics.failedRuns > 0 ? 'danger' : 'neutral'}
                />

                {showUseCases ? (
                    <InsightsKpiCard
                        testId={`${testIdPrefix}-use-cases`}
                        label="Use cases"
                        value={useCaseCount}
                        subtitle="Assigned workflows"
                        icon={Layers}
                        variant="info"
                    />
                ) : (
                    <InsightsKpiCard
                        testId={`${testIdPrefix}-in-progress`}
                        label="In progress"
                        value={metrics.inProgressRuns}
                        subtitle="Queued or running"
                        icon={Activity}
                        variant={metrics.inProgressRuns > 0 ? 'warning' : 'neutral'}
                    />
                )}
            </div>

            <InsightsRunStatusStrip metrics={metrics} testId={`${testIdPrefix}-status-strip`} />
            <InsightsActivityChips metrics={metrics} testId={`${testIdPrefix}-activity-chips`} />
        </div>
    );
}
