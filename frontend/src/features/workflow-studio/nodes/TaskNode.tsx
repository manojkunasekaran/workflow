import { memo, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Code2 } from 'lucide-react';
import { TASK_TYPE_LABELS, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import {
    studioIconBoxHeight,
    studioParallelBranchIconBoxHeight,
    studioParallelBranchTaskNodeHeight,
    studioMainInputHandleTop,
    studioTaskNodeHeight,
    usesParallelBranchStretchedTile,
} from '@/features/workflow-studio/constants/taskNodeLayout';
import { resolveTaskAccentColor } from '@/features/workflow-studio/constants/studioNodeTheme';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { summarizeValidationErrors } from '@/features/workflow-studio/task-type-schema/utils';
import { resolveTaskOutputViews } from '@/features/workflow-studio/lib/graphRouting';
import { resolveTaskDisplayName } from '@/features/workflow-studio/lib/taskDisplayName';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import {
    TaskInputHandle,
    TaskOutputHandle,
    shouldShowInputLabel,
} from '@/features/workflow-studio/nodes/TaskOutputHandles';
import { StudioNodeShell } from '@/features/workflow-studio/nodes/StudioNodeShell';
import { StudioNodeHoverActions } from '@/features/workflow-studio/nodes/StudioNodeHoverActions';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';

import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';

export type TaskNodeStudioGraph = {
    onMainSpine: boolean;
    hasBranchChainOut: boolean;
    workflowTasks?: Array<{
        taskId: string;
        type: string;
        parameters: Record<string, unknown>;
    }>;
    validationErrors?: TaskParameterErrors;
    addHandleIds?: string[];
};

export type TaskNodeData = {
    taskId: string;
    displayName?: string;
    type: StudioTaskType | string;
    parameters: Record<string, unknown>;
    studioGraph?: TaskNodeStudioGraph;
};

function TaskNodeComponent({ data, selected }: NodeProps & { data: TaskNodeData }) {
    const plugin = getTaskTypePlugin(data.type);
    const Icon = plugin?.icon ?? Code2;
    const accentColor = plugin?.accentColor ?? resolveTaskAccentColor(data.type);

    const { inputs, outputs, isRoutingTerminator } = useMemo(
        () => resolveTaskOutputViews(data),
        [data],
    );

    const { onAddTaskClick, onBranchAddClick, onTaskEdit, onTaskDelete, readOnly } =
        useCanvasActions();
    const addHandleIds = useMemo(
        () => new Set(data.studioGraph?.addHandleIds ?? []),
        [data.studioGraph?.addHandleIds],
    );

    const addClickFor = (handleId: string): (() => void) | undefined => {
        if (!addHandleIds.has(handleId)) return undefined;
        if (handleId === MAIN_OUT && data.studioGraph?.onMainSpine) {
            return onAddTaskClick ? () => onAddTaskClick() : undefined;
        }
        return onBranchAddClick ? () => onBranchAddClick(data.taskId, handleId) : undefined;
    };

    const visibleOutputs = useMemo(() => {
        const onMainSpine = data.studioGraph?.onMainSpine ?? false;
        const hasRoutingOutputs = outputs.some((output) => output.handleId !== MAIN_OUT);
        return outputs.filter((output) => {
            if (output.handleId !== MAIN_OUT) return true;
            if (onMainSpine) return true;
            return !hasRoutingOutputs;
        });
    }, [data.studioGraph?.onMainSpine, outputs]);

    const validationSummary = summarizeValidationErrors(data.studioGraph?.validationErrors ?? {});
    const hasValidationError = Boolean(validationSummary);
    const branchOutputCount = visibleOutputs.length;
    const stretchIconTile =
        data.type === 'BRANCH' && usesParallelBranchStretchedTile(branchOutputCount);
    const iconBoxHeight =
        data.type === 'BRANCH'
            ? studioParallelBranchIconBoxHeight(branchOutputCount)
            : studioIconBoxHeight(
                  branchOutputCount,
                  isRoutingTerminator,
                  hasValidationError,
              );
    const totalHeight =
        data.type === 'BRANCH'
            ? studioParallelBranchTaskNodeHeight(branchOutputCount, hasValidationError)
            : studioTaskNodeHeight(branchOutputCount, isRoutingTerminator, hasValidationError);

    const title = resolveTaskDisplayName(data);
    const typeLabel = TASK_TYPE_LABELS[data.type as StudioTaskType] ?? data.type;
    const label = title === typeLabel ? typeLabel : title;

    return (
        <StudioNodeShell
            iconBoxHeight={iconBoxHeight}
            totalHeight={totalHeight}
            stretchIconTile={stretchIconTile}
            accentColor={accentColor}
            icon={Icon}
            label={label}
            selected={selected}
            invalid={hasValidationError}
            errorMessage={hasValidationError ? validationSummary ?? undefined : undefined}
            hoverActions={
                readOnly ? null : (
                    <StudioNodeHoverActions
                        onEdit={onTaskEdit ? () => onTaskEdit(data.taskId) : undefined}
                        onDelete={onTaskDelete ? () => onTaskDelete(data.taskId) : undefined}
                    />
                )
            }
        >
            {inputs.map((input) => (
                <TaskInputHandle
                    key={input.id}
                    input={{
                        ...input,
                        top:
                            inputs.length === 1
                                ? studioMainInputHandleTop(iconBoxHeight)
                                : input.top,
                    }}
                    showLabel={shouldShowInputLabel(input.id)}
                />
            ))}

            {visibleOutputs.map((output) => (
                <TaskOutputHandle
                    key={output.handleId}
                    output={{
                        ...output,
                        label:
                            output.handleId === MAIN_OUT || output.wired
                                ? ''
                                : output.label,
                    }}
                    onAddClick={addClickFor(output.handleId)}
                />
            ))}
        </StudioNodeShell>
    );
}

export const TaskNode = memo(TaskNodeComponent);
