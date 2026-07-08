import { Handle, Position } from '@xyflow/react';
import type { MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';
import {
    STUDIO_EDGE_CONTROL_BUTTON_CLASS,
    STUDIO_EDGE_CONTROL_ICON_CLASS,
} from '@/features/workflow-studio/edges/studioEdgeTheme';
import {
    STUDIO_HANDLE_BORDER_OVERLAP,
    STUDIO_HANDLE_COLOR,
    STUDIO_HANDLE_SIZE,
} from '@/features/workflow-studio/nodes/StudioHandle';

const HANDLE_RADIUS = STUDIO_HANDLE_SIZE / 2;
const HANDLE_CENTER_NUDGE = HANDLE_RADIUS - STUDIO_HANDLE_BORDER_OVERLAP;

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
    label,
    onAddClick,
    addTitle = 'Add task',
}: {
    id: string;
    type: 'source' | 'target';
    side: 'left' | 'right';
    top?: string | number;
    /** @deprecated Handle color is unified — kept for call-site compatibility. */
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
                className="pointer-events-auto !relative !left-auto !right-auto !top-auto !border-0"
                style={{
                    width: STUDIO_HANDLE_SIZE,
                    height: STUDIO_HANDLE_SIZE,
                    backgroundColor: STUDIO_HANDLE_COLOR,
                    position: 'relative',
                    transform: isRight
                        ? `translateX(-${HANDLE_CENTER_NUDGE}px)`
                        : `translateX(${HANDLE_CENTER_NUDGE}px)`,
                }}
            />
            {onAddClick ? (
                <>
                    {label ? (
                        <span className="pointer-events-none mr-1 whitespace-nowrap text-[11px] font-medium text-[#64748b]">
                            {label}
                        </span>
                    ) : null}
                    <span
                        className="pointer-events-none h-0 w-5 border-t-2 border-dashed border-[#94a3b8] opacity-80"
                        aria-hidden
                    />
                    <Hint content={addTitle}>
                        <button
                            type="button"
                            aria-label={addTitle}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onAddClick?.(event);
                            }}
                            className={cn('nodrag nopan pointer-events-auto', STUDIO_EDGE_CONTROL_BUTTON_CLASS)}
                        >
                            <Plus className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.5} />
                        </button>
                    </Hint>
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
