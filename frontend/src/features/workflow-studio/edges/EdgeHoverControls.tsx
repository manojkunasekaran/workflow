import { useEffect, useRef, useState } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';
import { TippyHint } from '@/components/ui/tippy-hint';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';
import {
    canDeleteStudioEdge,
    canInsertOnStudioEdge,
    type StudioEdgeActionKind,
} from '@/features/workflow-studio/lib/studioEdgeActions';
import type { Edge } from '@xyflow/react';
import {
    STUDIO_EDGE_CONTROL_DESTRUCTIVE_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_DIVIDER_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS,
    STUDIO_EDGE_CONTROL_ICON_CLASS,
} from '@/features/workflow-studio/edges/studioEdgeTheme';
import { cn } from '@/lib/utils';

const HOVER_HIDE_DELAY_MS = 150;
/** Wide transparent stroke along the edge — must overlap the HTML control hit area. */
const EDGE_HOVER_STROKE_WIDTH = 48;

export function EdgeHoverControls({
    edge,
    edgePath,
    labelX,
    labelY,
    actionKind,
}: {
    edge: Edge;
    edgePath: string;
    labelX: number;
    labelY: number;
    actionKind?: StudioEdgeActionKind;
}) {
    const { readOnly, onEdgeInsert, onEdgeDelete } = useCanvasActions();
    const [hovered, setHovered] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const canInsert = !readOnly && canInsertOnStudioEdge(actionKind) && onEdgeInsert;
    const canDelete = !readOnly && canDeleteStudioEdge(actionKind) && onEdgeDelete;

    const setHover = (active: boolean) => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        if (active) {
            setHovered(true);
            return;
        }
        hideTimerRef.current = setTimeout(() => setHovered(false), HOVER_HIDE_DELAY_MS);
    };

    useEffect(
        () => () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        },
        [],
    );

    if (!canInsert && !canDelete) return null;

    const showControls = hovered || edge.selected;

    return (
        <>
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={EDGE_HOVER_STROKE_WIDTH}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    className={cn(
                        'nodrag nopan p-3 transition-opacity duration-100',
                        showControls ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                    )}
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                >
                    <div className={STUDIO_EDGE_CONTROL_GROUP_CLASS}>
                        {canInsert ? (
                            <TippyHint content="Insert task">
                                <button
                                    type="button"
                                    aria-label="Insert task on this connection"
                                    className={cn('nodrag nopan', STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS)}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onEdgeInsert?.(edge);
                                    }}
                                >
                                    <Plus className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.5} />
                                </button>
                            </TippyHint>
                        ) : null}
                        {canDelete ? (
                            <TippyHint content="Remove connection">
                                <button
                                    type="button"
                                    aria-label="Remove this connection"
                                    className={cn(
                                        'nodrag nopan',
                                        STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS,
                                        canInsert && STUDIO_EDGE_CONTROL_GROUP_DIVIDER_CLASS,
                                        STUDIO_EDGE_CONTROL_DESTRUCTIVE_CLASS,
                                    )}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onEdgeDelete?.(edge);
                                    }}
                                >
                                    <Trash2 className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.5} />
                                </button>
                            </TippyHint>
                        ) : null}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
