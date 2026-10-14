import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const statusBadgeVariants = cva(
    'inline-flex items-center border font-medium uppercase tracking-wide',
    {
        variants: {
            variant: {
                success:
                    'border-success/30 bg-success-muted text-success dark:border-success/40 dark:bg-success-muted dark:text-success',
                danger:
                    'border-danger/30 bg-danger-muted text-danger dark:border-danger/40 dark:bg-danger-muted dark:text-danger',
                warning:
                    'border-warning/30 bg-warning-muted text-warning dark:border-warning/40 dark:bg-warning-muted dark:text-warning',
                info: 'border-info/30 bg-info-muted text-info dark:border-info/40 dark:bg-info-muted dark:text-info',
                neutral: 'border-border bg-muted text-muted-foreground',
            },
            size: {
                sm: 'rounded-md px-2 py-[3px] text-[9px]',
                md: 'rounded-md px-2.5 py-1 text-[11px]',
                lg: 'rounded-md px-3 py-1.5 text-xs',
            },
        },
        defaultVariants: {
            variant: 'neutral',
            size: 'md',
        },
    },
);

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof statusBadgeVariants> {
    pulse?: boolean;
}

export function StatusBadge({
    className,
    variant,
    size,
    pulse = false,
    ...props
}: StatusBadgeProps) {
    return (
        <span
            className={cn(statusBadgeVariants({ variant, size }), pulse && 'animate-pulse', className)}
            {...props}
        />
    );
}
