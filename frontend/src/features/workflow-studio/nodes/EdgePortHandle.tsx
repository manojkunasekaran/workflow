import { Handle, Position } from '@xyflow/react';
import type { MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STUDIO_HANDLE_SIZE } from '@/features/workflow-studio/nodes/StudioHandle';

const HANDLE_RADIUS = STUDIO_HANDLE_SIZE / 2;

/**
 * Handle centered on the node border; label sits outside the card (n8n-style).
 * Uses `left/right: 100%` so only the dot straddles the edge — labels never sit inside the card.
 * When `onAddClick` is provided, an inline "+" button is rendered at the end of
 * the stub (replacing the standalone add-task node — n8n's "add node connector").
 */
export function EdgePortHandle({
    id,
    type,
    side,
    top = '50%',
    color = '#94a3b8',
    label,
    onAddClick,
    addTitle = 'Add task',
}: {
    id: string;
    type: 'source' | 'target';
    side: 'left' | 'right';
    top?: string | number;
    color?: string;
    label?: string;
    onAddClick?: (event: MouseEvent) => void;
    addTitle?: string;
}) {
    const isRight = side === 'right';

    return (
        <div
            className={cn(
                'pointer-events-none absolute z-20 flex items-center',
                isRight ? 'flex-row' : 'flex-row-reverse',
            )}
            style={{
                top,
                transform: 'translateY(-50%)',
                ...(isRight ? { left: '100%' } : { right: '100%' }),
            }}
        >
            <Handle
                type={type}
                position={isRight ? Position.Right : Position.Left}
                id={id}
                className="pointer-events-auto !relative !left-auto !right-auto !top-auto !border-[2.5px] !bg-white !shadow-sm"
                style={{
                    width: STUDIO_HANDLE_SIZE,
                    height: STUDIO_HANDLE_SIZE,
                    borderColor: color,
                    position: 'relative',
                    transform: isRight ? `translateX(-${HANDLE_RADIUS}px)` : `translateX(${HANDLE_RADIUS}px)`,
                }}
            />
            {onAddClick ? (
                <>
                    <span
                        className="pointer-events-none h-0 w-6 border-t-2 border-dashed"
                        style={{ borderColor: color }}
                        aria-hidden
                    />
                    <button
                        type="button"
                        title={addTitle}
                        aria-label={addTitle}
                        onClick={onAddClick}
                        className="nodrag nopan pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md border-2 border-dashed border-[#c6c6cd] bg-white text-[#0058be] shadow-sm transition-colors hover:border-[#0058be] hover:bg-[#eff4ff]"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    {label ? (
                        <span className="pointer-events-none ml-1.5 whitespace-nowrap text-[11px] font-medium text-[#64748b]">
                            {label}
                        </span>
                    ) : null}
                </>
            ) : label ? (
                <span
                    className={cn(
                        'pointer-events-none whitespace-nowrap text-[11px] font-medium text-[#64748b]',
                        isRight ? 'ml-1.5' : 'mr-1.5',
                    )}
                >
                    {label}
                </span>
            ) : null}
        </div>
    );
}
