import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatInsightTimestamp } from '@/features/integrations/lib/useCaseInsightsFormatters';
import type { InsightsRunMetrics } from '@/features/integrations/lib/insightsDashboardUtils';
import { cn } from '@/lib/utils';

interface InsightsActivityChipsProps {
    metrics: InsightsRunMetrics;
    testId?: string;
}

export function InsightsActivityChips({ metrics, testId }: InsightsActivityChipsProps) {
    return (
        <div
            data-testid={testId}
            className="flex flex-wrap gap-2"
        >
            <span
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                    'bg-background/80 text-muted-foreground',
                )}
            >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Last run{' '}
                <span className="font-medium text-foreground">
                    {formatInsightTimestamp(metrics.lastRunAt)}
                </span>
            </span>
            {metrics.inProgressRuns > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-muted px-3 py-1 text-xs text-warning-foreground">
                    <Loader2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium tabular-nums">{metrics.inProgressRuns}</span>
                    in progress
                </span>
            ) : null}
            {metrics.completedRuns > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-muted px-3 py-1 text-xs text-success-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium tabular-nums">{metrics.completedRuns}</span>
                    completed
                </span>
            ) : null}
        </div>
    );
}
