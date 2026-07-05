import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { EdgeHoverControls } from '@/features/workflow-studio/edges/EdgeHoverControls';
import { edgeFromEdgeProps } from '@/features/workflow-studio/edges/edgeFromProps';
import type { StudioEdgeData } from '@/features/workflow-studio/lib/studioEdgeActions';
import {
    STUDIO_SEQUENCE_STROKE,
    STUDIO_SEQUENCE_WIDTH,
    STUDIO_SEQUENCE_WIDTH_SELECTED,
    getStudioEdgePath,
} from '@/features/workflow-studio/edges/studioEdgeTheme';

export function ChainEdge(props: EdgeProps) {
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

    const edgeData = data as StudioEdgeData | undefined;
    const isStub = edgeData?.studioActionKind === 'stub';
    const [edgePath, labelX, labelY] = getStudioEdgePath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    const edge = edgeFromEdgeProps(props);

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                interactionWidth={20}
                markerEnd={isStub ? undefined : markerEnd}
                style={{
                    stroke: STUDIO_SEQUENCE_STROKE,
                    strokeWidth: selected ? STUDIO_SEQUENCE_WIDTH_SELECTED : STUDIO_SEQUENCE_WIDTH,
                    strokeDasharray: isStub ? '4 4' : undefined,
                }}
            />
            {!isStub ? (
                <EdgeHoverControls
                    edge={edge}
                    edgePath={edgePath}
                    labelX={labelX}
                    labelY={labelY}
                    actionKind={edgeData?.studioActionKind}
                />
            ) : null}
        </>
    );
}
