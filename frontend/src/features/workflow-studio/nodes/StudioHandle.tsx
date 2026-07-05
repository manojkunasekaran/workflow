import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

export const STUDIO_HANDLE_SIZE = 14;
export const STUDIO_HANDLE_COLOR = '#94a3b8';
/** Nudge handle center inward so wires meet the tile border (pairs with border-2). */
export const STUDIO_HANDLE_BORDER_OVERLAP = 2;

/** React Flow handle — use native edge positioning, no absolute CSS overrides. */
export function StudioHandle({
    id,
    type,
    position,
    top = '50%',
}: {
    id: string;
    type: 'source' | 'target';
    position: Position;
    top?: string | number;
}) {
    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={cn('!border-0')}
            style={{
                top,
                width: STUDIO_HANDLE_SIZE,
                height: STUDIO_HANDLE_SIZE,
                backgroundColor: STUDIO_HANDLE_COLOR,
            }}
        />
    );
}
