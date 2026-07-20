import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusBadgeProps } from '@/components/ui/status-badge';
import { executionStatusLabel, executionStatusVariant } from '@/features/executions/lib/executionDisplay';

export type ExecutionStatusBadgePlacement = 'inline' | 'overlay-top-center';

export interface ExecutionStatusBadgeProps {
    status: string;
    className?: string;
    placement?: ExecutionStatusBadgePlacement;
    size?: StatusBadgeProps['size'];
}

const placementClass: Record<ExecutionStatusBadgePlacement, string | undefined> = {
    inline: undefined,
    'overlay-top-center':
        'pointer-events-none absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 shadow-sm',
};

const iconSizeClass: Record<NonNullable<StatusBadgeProps['size']>, string> = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
};

export function ExecutionStatusBadge({
    status,
    className,
    placement = 'inline',
    size = 'md',
}: ExecutionStatusBadgeProps) {
    const normalized = status.toUpperCase();
    const label = executionStatusLabel(status);
    const isRunning = normalized === 'RUNNING';

    return (
        <StatusBadge
            variant={executionStatusVariant(status)}
            size={size}
            className={cn(isRunning && 'gap-1', placementClass[placement], className)}
        >
            {isRunning ? (
                <Loader2
                    className={cn(iconSizeClass[size ?? 'md'], 'shrink-0 animate-spin')}
                    aria-hidden
                />
            ) : null}
            {label}
        </StatusBadge>
    );
}
