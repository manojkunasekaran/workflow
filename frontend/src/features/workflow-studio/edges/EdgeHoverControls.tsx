import { useState } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';
import {
    canDeleteStudioEdge,
    canInsertOnStudioEdge,
    type StudioEdgeActionKind,
} from '@/features/workflow-studio/lib/studioEdgeActions';
import type { Edge } from '@xyflow/react';
import { cn } from '@/lib/utils';

const controlClass = cn(
    'flex h-5 w-5 items-center justify-center rounded-sm border border-[#c6c6cd] bg-white/95 text-[#64748b]',
    'opacity-0 shadow-none transition-opacity group-hover/edge:opacity-100 group-focus-within/edge:opacity-100',
    'hover:border-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0058be]',
);

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

    const canInsert = !readOnly && canInsertOnStudioEdge(actionKind) && onEdgeInsert;
    const canDelete = !readOnly && canDeleteStudioEdge(actionKind) && onEdgeDelete;

    if (!canInsert && !canDelete) return null;

    const showControls = hovered || edge.selected;

    return (
        <>
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            />
            {showControls ? (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="group/edge flex items-center gap-0.5 opacity-100"
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        {canInsert ? (
                            <button
                                type="button"
                                title="Insert task"
                                aria-label="Insert task on this connection"
                                className={cn(controlClass, 'opacity-100')}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onEdgeInsert?.(edge);
                                }}
                            >
                                <Plus className="h-3 w-3" strokeWidth={2} />
                            </button>
                        ) : null}
                        {canDelete ? (
                            <button
                                type="button"
                                title="Remove connection"
                                aria-label="Remove this connection"
                                className={cn(
                                    controlClass,
                                    'opacity-100 hover:border-[#fca5a5] hover:text-[#dc2626]',
                                )}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onEdgeDelete?.(edge);
                                }}
                            >
                                <Trash2 className="h-2.5 w-2.5" strokeWidth={2} />
                            </button>
                        ) : null}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    );
}
