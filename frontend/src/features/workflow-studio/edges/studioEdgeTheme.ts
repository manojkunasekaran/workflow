import { MarkerType, Position, getBezierPath, type EdgeMarker } from '@xyflow/react';
import { cn } from '@/lib/utils';

/** Shared sequence-line stroke (main spine + branch chains). */
export const STUDIO_SEQUENCE_STROKE = '#94a3b8';
export const STUDIO_SEQUENCE_WIDTH = 2.5;
export const STUDIO_SEQUENCE_WIDTH_SELECTED = 3;

/** Bezier bend strength for canvas edges (0 = straight, 1 = very curved). */
export const STUDIO_EDGE_CURVATURE = 0.35;

type StudioEdgePathParams = Parameters<typeof getBezierPath>[0];

export function getStudioEdgePath(params: StudioEdgePathParams): ReturnType<typeof getBezierPath> {
    return getBezierPath({ ...params, curvature: STUDIO_EDGE_CURVATURE });
}

export const STUDIO_FORK_STROKE = '#f59e0b';
export const STUDIO_MERGE_STROKE = '#d97706';
export const STUDIO_JOIN_NEXT_STROKE = '#10b981';
export const STUDIO_LOOP_STROKE = '#0ea5e9';

export const STUDIO_EDGE_CLASS = 'studio-edge';

export function resolveRouteStroke(_routeKind?: string, _strokeColor?: string): string {
    return STUDIO_SEQUENCE_STROKE;
}

/** Fork-out routes show a label (If / Loop / Done) anchored near the source handle. */
export function isRouteForkKind(routeKind?: string): boolean {
    return (
        routeKind === 'parallel' ||
        routeKind === 'loop' ||
        routeKind === 'loop-done' ||
        routeKind === 'conditional' ||
        routeKind === 'human'
    );
}

const ROUTE_LABEL_INSET = 28;

/** Place route labels just off the source handle along the first edge segment. */
export function routeEdgeLabelAnchor(
    sourceX: number,
    sourceY: number,
    sourcePosition: Position,
): { x: number; y: number; transform: string } {
    switch (sourcePosition) {
        case Position.Left:
            return {
                x: sourceX - ROUTE_LABEL_INSET,
                y: sourceY,
                transform: 'translate(-100%, -50%)',
            };
        case Position.Top:
            return {
                x: sourceX,
                y: sourceY - ROUTE_LABEL_INSET,
                transform: 'translate(-50%, -100%)',
            };
        case Position.Bottom:
            return {
                x: sourceX,
                y: sourceY + ROUTE_LABEL_INSET,
                transform: 'translate(-50%, 0)',
            };
        case Position.Right:
        default:
            return {
                x: sourceX + ROUTE_LABEL_INSET,
                y: sourceY,
                transform: 'translate(0, -50%)',
            };
    }
}

/** Directional arrow at the target end of an edge. */
export function studioEdgeMarkerEnd(color: string): EdgeMarker {
    return {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color,
    };
}

/** Shared insert/delete/+ affordance on edges and handle stubs. */
export const STUDIO_EDGE_CONTROL_BUTTON_CLASS = cn(
    'flex h-6 w-6 items-center justify-center rounded-md border border-[#c6c6cd] bg-white/95 text-[#64748b] shadow-sm transition-colors',
    'hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]',
);

/** Delete/remove on canvas edge and node hover controls — red tint on hover, no extra border. */
export const STUDIO_EDGE_CONTROL_DESTRUCTIVE_CLASS = cn(
    'hover:border-0 hover:bg-destructive/10 hover:text-destructive',
);

/** Grouped controls — one solid hit target so flex gap does not drop hover between icons. */
export const STUDIO_EDGE_CONTROL_GROUP_CLASS = cn(
    'flex items-stretch overflow-hidden rounded-md border border-[#c6c6cd] bg-white/95 shadow-sm',
);

export const STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS = cn(
    STUDIO_EDGE_CONTROL_BUTTON_CLASS,
    'rounded-none border-0 shadow-none',
);

export const STUDIO_EDGE_CONTROL_GROUP_DIVIDER_CLASS = 'border-l border-[#c6c6cd]';

export const STUDIO_EDGE_CONTROL_ICON_CLASS = 'h-3.5 w-3.5';

export function studioRouteMarkerEnd(routeKind?: string, strokeColor?: string): EdgeMarker {
    return studioEdgeMarkerEnd(resolveRouteStroke(routeKind, strokeColor));
}
