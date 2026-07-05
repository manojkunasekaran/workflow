import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { EdgeHoverControls } from '@/features/workflow-studio/edges/EdgeHoverControls';
import { edgeFromEdgeProps } from '@/features/workflow-studio/edges/edgeFromProps';
import type { StudioEdgeData } from '@/features/workflow-studio/lib/studioEdgeActions';
import {
    STUDIO_SEQUENCE_STROKE,
    STUDIO_SEQUENCE_WIDTH,
    STUDIO_SEQUENCE_WIDTH_SELECTED,
    getStudioEdgePath,
    isRouteForkKind,
    routeEdgeLabelAnchor,
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
        markerEnd,
    } = props;

    const routeData = data as StudioEdgeData | undefined;
    const [edgePath, labelX, labelY] = getStudioEdgePath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    const isMerge = routeData?.routeKind === 'join';
    const showEdgeLabel = isRouteForkKind(routeData?.routeKind) && Boolean(routeData?.label);
    const labelAnchor = routeEdgeLabelAnchor(sourceX, sourceY, sourcePosition);

    const edge = edgeFromEdgeProps(props);

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                interactionWidth={20}
                markerEnd={markerEnd}
                style={{
                    stroke: STUDIO_SEQUENCE_STROKE,
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
                            transform: `${labelAnchor.transform} translate(${labelAnchor.x}px,${labelAnchor.y}px)`,
                            pointerEvents: 'none',
                        }}
                        className="rounded border border-white/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#64748b] shadow-sm"
                    >
                        {routeData.label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
