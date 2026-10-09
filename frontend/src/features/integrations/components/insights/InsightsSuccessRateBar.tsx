import { cn } from '@/lib/utils';
import { successRatePercent } from '@/features/integrations/lib/insightsDashboardUtils';

interface InsightsSuccessRateBarProps {
    completedRuns: number;
    failedRuns: number;
    showLabel?: boolean;
    className?: string;
    testId?: string;
}

export function InsightsSuccessRateBar({
    completedRuns,
    failedRuns,
    showLabel = true,
    className,
    testId,
}: InsightsSuccessRateBarProps) {
    const percent = successRatePercent(completedRuns, failedRuns);
    const terminal = completedRuns + failedRuns;

    return (
        <div className={cn('space-y-1.5', className)} data-testid={testId}>
            {showLabel ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Success rate</span>
                    <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                        {percent === null ? '—' : `${percent}%`}
                    </span>
                </div>
            ) : null}
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted/80 flex"
                role="progressbar"
                aria-valuenow={percent ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Success rate"
            >
                {terminal === 0 ? (
                    <div className="h-full w-full bg-muted" />
                ) : (
                    <>
                        <div
                            className="h-full bg-emerald-500 transition-[width] duration-300"
                            style={{ width: `${((completedRuns / terminal) * 100).toFixed(2)}%` }}
                        />
                        <div
                            className="h-full bg-red-400/90 dark:bg-red-500/80 transition-[width] duration-300"
                            style={{ width: `${((failedRuns / terminal) * 100).toFixed(2)}%` }}
                        />
                    </>
                )}
            </div>
            {showLabel && terminal > 0 ? (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                    {completedRuns} succeeded · {failedRuns} failed
                </p>
            ) : null}
        </div>
    );
}
