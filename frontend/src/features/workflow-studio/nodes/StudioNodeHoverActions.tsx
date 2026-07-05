import { Settings2, Trash2 } from 'lucide-react';
import { TippyHint } from '@/components/ui/tippy-hint';
import { cn } from '@/lib/utils';
import { N8N_NODE_LAYOUT } from '@/features/workflow-studio/constants/taskNodeLayout';
import {
    STUDIO_EDGE_CONTROL_DESTRUCTIVE_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_DIVIDER_CLASS,
    STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS,
    STUDIO_EDGE_CONTROL_ICON_CLASS,
} from '@/features/workflow-studio/edges/studioEdgeTheme';

export function StudioNodeHoverActions({
    onEdit,
    onDelete,
    visible = false,
    onHoverChange,
}: {
    onEdit?: () => void;
    onDelete?: () => void;
    visible?: boolean;
    onHoverChange?: (active: boolean) => void;
}) {
    if (!onEdit && !onDelete) return null;

    return (
        <div
            className={cn(
                'nodrag nopan absolute bottom-full left-1/2 z-30 flex -translate-x-1/2 flex-col items-center transition-opacity duration-100',
                visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{ width: N8N_NODE_LAYOUT.iconSize }}
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
        >
            <div className={STUDIO_EDGE_CONTROL_GROUP_CLASS}>
                {onEdit ? (
                    <TippyHint content="Configure task">
                        <button
                            type="button"
                            aria-label="Configure task"
                            className={cn('nodrag nopan', STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS)}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Settings2 className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.25} />
                        </button>
                    </TippyHint>
                ) : null}
                {onDelete ? (
                    <TippyHint content="Delete task">
                        <button
                            type="button"
                            aria-label="Delete task"
                            className={cn(
                                'nodrag nopan',
                                STUDIO_EDGE_CONTROL_GROUP_ITEM_CLASS,
                                onEdit && STUDIO_EDGE_CONTROL_GROUP_DIVIDER_CLASS,
                                STUDIO_EDGE_CONTROL_DESTRUCTIVE_CLASS,
                            )}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className={STUDIO_EDGE_CONTROL_ICON_CLASS} strokeWidth={2.25} />
                        </button>
                    </TippyHint>
                ) : null}
            </div>
            {/* Narrow bridge from buttons down to the tile — not wider than the icon. */}
            <div className="h-3 w-full shrink-0" aria-hidden />
        </div>
    );
}
