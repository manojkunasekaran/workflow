import { memo, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Code2 } from 'lucide-react';
import { TASK_TYPE_LABELS, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import {
    studioIconBoxHeight,
    studioParallelBranchIconBoxHeight,
    studioParallelBranchTaskNodeHeight,
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
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { executionNodeBorderClass } from '@/features/executions/lib/executionNodeStatus';

import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import type { ExecutionNodeStatus } from '@/features/executions/lib/executionNodeStatus';

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
    executionStatus?: ExecutionNodeStatus;
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
    // Connector nodes store their CDN icon URL in parameters so the canvas can render it
    const connectorIconUrl = data.type === 'CONNECTOR_TASK'
        ? (data.parameters?.connectorIcon as string | undefined)
        : undefined;

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
    const executionStatus = data.studioGraph?.executionStatus;
    const executionBorderClass = executionStatus
        ? executionNodeBorderClass(executionStatus.status)
        : undefined;
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
        <div className="relative">
            {executionStatus ? (
                <ExecutionStatusBadge
                    status={executionStatus.status}
                    placement="overlay-top-center"
                    size="sm"
                />
            ) : null}
            <StudioNodeShell
            iconBoxHeight={iconBoxHeight}
            totalHeight={totalHeight}
            stretchIconTile={stretchIconTile}
            accentColor={accentColor}
            icon={Icon}
            iconUrl={connectorIconUrl}
            label={label}
            selected={selected}
            invalid={hasValidationError}
            errorMessage={
                hasValidationError
                    ? validationSummary ?? undefined
                    : executionStatus?.status === 'FAILED'
                      ? executionStatus.errorMessage
                      : undefined
            }
            statusBorderClass={executionBorderClass}
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
                    input={input}
                    showLabel={shouldShowInputLabel(input.id)}
                />
            ))}

            {visibleOutputs.map((output) => (
                <TaskOutputHandle
                    key={output.handleId}
                    output={output}
                    onAddClick={addClickFor(output.handleId)}
                />
            ))}
        </StudioNodeShell>
        </div>
    );
}

export const TaskNode = memo(TaskNodeComponent);
