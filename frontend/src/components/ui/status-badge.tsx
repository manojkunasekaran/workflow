import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const statusBadgeVariants = cva(
    'inline-flex items-center border font-medium uppercase tracking-wide',
    {
        variants: {
            variant: {
                success: 'border-green-200 bg-green-50 text-green-700',
                danger: 'border-red-200 bg-red-50 text-red-700',
                warning: 'border-amber-200 bg-amber-50 text-amber-700',
                info: 'border-sky-200 bg-sky-50 text-sky-700',
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
