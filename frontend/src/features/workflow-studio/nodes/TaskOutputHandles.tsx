import { MAIN_IN, isJoinMergeInput } from '@/features/workflow-studio/lib/graphHandles';
import type { TaskInputView, TaskOutputView } from '@/features/workflow-studio/lib/graphRouting';
import { Hint } from '@/components/ui/hint';
import { EdgePortHandle } from '@/features/workflow-studio/nodes/EdgePortHandle';

export function TaskInputHandle({
    input,
    showLabel,
}: {
    input: TaskInputView;
    showLabel: boolean;
}) {
    if (isJoinMergeInput(input.id)) {
        return (
            <EdgePortHandle
                id={input.id}
                type="target"
                side="left"
                top={input.top}
                label={input.label}
            />
        );
    }

    return (
        <>
            {showLabel && input.label && (
                <Hint content={input.label}>
                    <span
                        className="absolute left-2 top-1/2 z-10 max-w-[72px] -translate-y-1/2 truncate text-[10px] font-medium text-[#64748b]"
                    >
                        {input.label}
                    </span>
                </Hint>
            )}
            <EdgePortHandle id={input.id} type="target" side="left" top={input.top} />
        </>
    );
}

/** Output handle on the node border with label outside the card. */
export function TaskOutputHandle({
    output,
    onAddClick,
}: {
    output: TaskOutputView;
    onAddClick?: () => void;
}) {
    return (
        <EdgePortHandle
            id={output.handleId}
            type="source"
            side="right"
            top={output.top}
            color={output.color}
            label={output.label || undefined}
            onAddClick={onAddClick}
            addTitle={output.label ? `Add ${output.label}` : 'Add task'}
        />
    );
}

export function shouldShowInputLabel(handleId: string): boolean {
    return handleId !== MAIN_IN && !isJoinMergeInput(handleId);
}
