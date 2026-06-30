import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import { EdgeHoverControls } from '@/features/workflow-studio/edges/EdgeHoverControls';
import type { StudioEdgeData } from '@/features/workflow-studio/lib/studioEdgeActions';
import {
    STUDIO_FORK_STROKE,
    STUDIO_JOIN_NEXT_STROKE,
    STUDIO_MERGE_STROKE,
    STUDIO_SEQUENCE_WIDTH,
    STUDIO_SEQUENCE_WIDTH_SELECTED,
} from '@/features/workflow-studio/edges/studioEdgeTheme';

export function RouteEdge(props: EdgeProps) {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        data,
        selected,
    } = props;

    const routeData = data as StudioEdgeData | undefined;
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    const isFork = routeData?.routeKind === 'parallel';
    const isMerge = routeData?.routeKind === 'join';
    const isJoinNext = routeData?.routeKind === 'join-next';

    const stroke = isFork
        ? STUDIO_FORK_STROKE
        : isMerge
          ? STUDIO_MERGE_STROKE
          : isJoinNext
            ? STUDIO_JOIN_NEXT_STROKE
            : '#94a3b8';

    const showEdgeLabel =
        Boolean(routeData?.label) &&
        routeData?.routeKind !== 'join' &&
        routeData?.routeKind !== 'join-next';

    const edge = props as Edge;

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                interactionWidth={20}
                style={{
                    stroke,
                    strokeWidth: selected ? STUDIO_SEQUENCE_WIDTH_SELECTED : STUDIO_SEQUENCE_WIDTH,
                    strokeDasharray: isMerge ? '6 4' : undefined,
                }}
            />
            <EdgeHoverControls
                edge={edge}
                edgePath={edgePath}
                labelX={labelX}
                labelY={labelY}
                actionKind={routeData?.studioActionKind}
            />
            {showEdgeLabel && routeData?.label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 14}px)`,
                            pointerEvents: 'none',
                        }}
                        className="rounded border border-white/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                    >
                        <span style={{ color: stroke }}>{routeData.label}</span>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
