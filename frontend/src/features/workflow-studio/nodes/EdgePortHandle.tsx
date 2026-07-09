import { Handle, Position } from '@xyflow/react';
import type { CSSProperties, MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';
import {
    STUDIO_EDGE_CONTROL_BUTTON_CLASS,
    STUDIO_EDGE_CONTROL_ICON_CLASS,
} from '@/features/workflow-studio/edges/studioEdgeTheme';

type EdgePortHandleProps = {
    id: string;
    type: 'source' | 'target';
    side: 'left' | 'right';
    /** Vertical position within the handle column — omit for React Flow default (50%). */
    top?: string | number;
    /** Input-side port name (e.g. join merge). Rendered beside the handle, not on the edge. */
    label?: string;
    onAddClick?: (event: MouseEvent) => void;
    addTitle?: string;
};

function handleTopStyle(top?: string | number): CSSProperties | undefined {
    return top !== undefined ? { top } : undefined;
}

function anchorTop(top?: string | number): string | number {
    return top ?? '50%';
}

/**
 * Port on the node tile border. Always uses React Flow's native Handle positioning.
 * Labels and "+" stubs are siblings — never wrapped around the handle.
 */
export function EdgePortHandle({
    id,
    type,
    side,
    top,
    label,
    onAddClick,
    addTitle = 'Add task',
}: EdgePortHandleProps) {
    const isRight = side === 'right';
    const position = isRight ? Position.Right : Position.Left;
    const y = anchorTop(top);

    return (
        <>
            <Handle type={type} position={position} id={id} style={handleTopStyle(top)} />

            {label ? (
                <span
                    className={cn(
                        'pointer-events-none absolute z-10 max-w-[80px] truncate whitespace-nowrap text-[10px] font-medium text-[#64748b]',
                        isRight ? 'left-full ml-2' : 'right-full mr-2',
                    )}
                    style={{ top: y, transform: 'translateY(-50%)' }}
                >
                    {label}
                </span>
            ) : null}

            {onAddClick ? (
                <div
                    className="nodrag nopan pointer-events-none absolute z-20 flex items-center"
                    style={{
                        top: y,
                        transform: 'translateY(-50%)',
                        ...(isRight ? { left: '100%', paddingLeft: 6 } : { right: '100%', paddingRight: 6 }),
                    }}
                >
                    <span
                        className="pointer-events-none h-0 w-4 border-t-2 border-dashed border-[#94a3b8] opacity-80"
                        aria-hidden
                    />
                    <Hint content={addTitle}>
                        <button
                            type="button"
                            aria-label={addTitle}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onAddClick(event);
                            }}
                            className={cn('pointer-events-auto', STUDIO_EDGE_CONTROL_BUTTON_CLASS)}
                        >
                            <Plus className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.5} />
                        </button>
                    </Hint>
                </div>
            ) : null}
        </>
    );
}
