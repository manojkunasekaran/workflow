import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

export const STUDIO_HANDLE_SIZE = 14;

/** React Flow handle — use native edge positioning, no absolute CSS overrides. */
export function StudioHandle({
    id,
    type,
    position,
    top = '50%',
    color = '#94a3b8',
}: {
    id: string;
    type: 'source' | 'target';
    position: Position;
    top?: string | number;
    color?: string;
}) {
    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={cn('!border-[2.5px] !bg-white !shadow-sm')}
            style={{
                top,
                width: STUDIO_HANDLE_SIZE,
                height: STUDIO_HANDLE_SIZE,
                borderColor: color,
            }}
        />
    );
}
