import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InsightsKpiVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const variantStyles: Record<InsightsKpiVariant, string> = {
    neutral:
        'border-border/80 bg-card shadow-sm border-l-4 border-l-primary/70',
    success:
        'border-success/30 bg-success-muted border-l-4 border-l-success',
    danger:
        'border-danger/30 bg-danger-muted border-l-4 border-l-danger',
    warning:
        'border-warning/30 bg-warning-muted border-l-4 border-l-warning',
    info:
        'border-info/30 bg-info-muted border-l-4 border-l-info',
};

const iconStyles: Record<InsightsKpiVariant, string> = {
    neutral: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
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
