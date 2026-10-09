import { InsightsSuccessRateBar } from './InsightsSuccessRateBar';
import { formatInsightSuccessRate } from '@/features/integrations/lib/useCaseInsightsFormatters';

interface InsightsTableSuccessCellProps {
    completedRuns: number;
    failedRuns: number;
}

export function InsightsTableSuccessCell({ completedRuns, failedRuns }: InsightsTableSuccessCellProps) {
    const label = formatInsightSuccessRate(completedRuns, failedRuns);

    return (
        <div className="min-w-[120px] space-y-1.5">
            <span className="text-sm font-medium tabular-nums">{label}</span>
            <InsightsSuccessRateBar
                completedRuns={completedRuns}
                failedRuns={failedRuns}
                showLabel={false}
            />
        </div>
    );
}
