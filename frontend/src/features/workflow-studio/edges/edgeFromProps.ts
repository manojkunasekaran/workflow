import type { Edge, EdgeProps } from '@xyflow/react';

type EdgeLike = Edge & {
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
};

/** Normalize handle fields — React Flow EdgeProps use *HandleId; stored edges use *Handle. */
export function normalizeStudioEdge(edge: EdgeLike): Edge {
    return {
        ...edge,
        sourceHandle: edge.sourceHandle ?? edge.sourceHandleId ?? undefined,
        targetHandle: edge.targetHandle ?? edge.targetHandleId ?? undefined,
    };
}

/** Map React Flow EdgeProps to a full Edge for studio action handlers. */
export function edgeFromEdgeProps(props: EdgeProps): Edge {
    return normalizeStudioEdge({
        id: props.id,
        source: props.source,
        target: props.target,
        sourceHandleId: props.sourceHandleId,
        targetHandleId: props.targetHandleId,
        type: props.type,
        data: props.data,
        selected: props.selected,
    });
}
