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

export function ExecutionStatusBadge({
    status,
    className,
    placement = 'inline',
    size = 'md',
}: ExecutionStatusBadgeProps) {
    const normalized = status.toUpperCase();
    const label = executionStatusLabel(status);

    return (
        <StatusBadge
            variant={executionStatusVariant(status)}
            size={size}
            pulse={normalized === 'RUNNING'}
            title={label}
            className={cn(placementClass[placement], className)}
        >
            {label}
        </StatusBadge>
    );
}
