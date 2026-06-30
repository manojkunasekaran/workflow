import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { EdgePortHandle } from '@/features/workflow-studio/nodes/EdgePortHandle';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';
import { cn } from '@/lib/utils';

export const START_NODE_HEIGHT = 56;

export type StartNodeData = {
    label: string;
    /** Show an inline "+" on the start output (empty workflow). */
    showAdd?: boolean;
};

function StartNodeComponent({ data, selected }: NodeProps & { data: StartNodeData }) {
    const { onAddTaskClick } = useCanvasActions();
    return (
        <div
            className={cn(
                'relative w-[200px] overflow-visible rounded-lg border bg-white shadow-sm',
                selected ? 'border-[#0d9488] ring-2 ring-[#0d9488]/30' : 'border-[#c6c6cd]',
            )}
            style={{ height: START_NODE_HEIGHT, minHeight: START_NODE_HEIGHT }}
        >
            <div className="flex h-full items-center gap-2.5 px-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d9488] text-white">
                    <Play className="h-4 w-4 fill-current" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#45464d]">Start</p>
                    <p className="truncate text-[13px] font-semibold text-[#0b1c30]">{data.label}</p>
                </div>
            </div>
            <EdgePortHandle
                type="source"
                side="right"
                id={MAIN_OUT}
                onAddClick={data.showAdd && onAddTaskClick ? () => onAddTaskClick() : undefined}
            />
        </div>
    );
}

export const StartNode = memo(StartNodeComponent);
