import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InsightsKpiVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const variantStyles: Record<InsightsKpiVariant, string> = {
    neutral:
        'border-border/80 bg-card shadow-sm border-l-4 border-l-primary/70',
    success:
        'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/25 border-l-4 border-l-emerald-500',
    danger:
        'border-red-200/80 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20 border-l-4 border-l-red-500',
    warning:
        'border-amber-200/80 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500',
    info:
        'border-sky-200/80 bg-sky-50/40 dark:border-sky-900/60 dark:bg-sky-950/25 border-l-4 border-l-sky-500',
};

const iconStyles: Record<InsightsKpiVariant, string> = {
    neutral: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
};

interface InsightsKpiCardProps {
    label: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    variant?: InsightsKpiVariant;
    testId?: string;
    emphasized?: boolean;
}

export function InsightsKpiCard({
    label,
    value,
    subtitle,
    icon: Icon,
    variant = 'neutral',
    testId,
    emphasized,
}: InsightsKpiCardProps) {
    return (
        <div
            data-testid={testId}
            className={cn(
                'rounded-xl border p-4 flex flex-col gap-2 min-h-[108px]',
                variantStyles[variant],
                emphasized && 'sm:min-h-[116px]',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </span>
                <div
                    className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        iconStyles[variant],
                    )}
                >
                    <Icon className="h-4 w-4" aria-hidden />
                </div>
            </div>
            <span
                className={cn(
                    'font-semibold tabular-nums tracking-tight text-foreground',
                    emphasized ? 'text-3xl' : 'text-2xl',
                )}
            >
                {value}
            </span>
            {subtitle ? (
                <span className="text-xs text-muted-foreground leading-snug">{subtitle}</span>
            ) : null}
        </div>
    );
}
