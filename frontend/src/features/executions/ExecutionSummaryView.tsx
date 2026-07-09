import type { ExecutionSummaryLine, ExecutionSummaryResult } from '@/features/executions/lib/executionSummaryUtils';
import { cn } from '@/lib/utils';

interface ExecutionSummaryViewProps {
    summary: ExecutionSummaryResult | null;
}

const toneClass: Record<NonNullable<ExecutionSummaryLine['tone']>, string> = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-amber-700',
    danger: 'text-destructive',
};

export function ExecutionSummaryView({ summary }: ExecutionSummaryViewProps) {
    if (!summary || summary.lines.length === 0) return null;

    return (
        <div className="mb-4 space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Run summary
            </p>
            <dl className="space-y-1.5">
                {summary.lines.map((line) => (
                    <div key={line.label} className="grid grid-cols-[96px_1fr] gap-2 text-xs">
                        <dt className="text-muted-foreground">{line.label}</dt>
                        <dd className={cn('min-w-0 break-words font-medium', toneClass[line.tone ?? 'default'])}>
                            {line.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
