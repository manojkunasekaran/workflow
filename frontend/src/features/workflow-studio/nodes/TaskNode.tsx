import { memo, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { AlertCircle, Bell, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_TYPE_LABELS, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import {
    ROUTING_NODE_LAYOUT,
    TASK_NODE_OUTPUT_LAYOUT,
    studioTaskNodeHeight,
    usesFixedNodeHeight,
} from '@/features/workflow-studio/constants/taskNodeLayout';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskPreview } from '@/features/workflow-studio/task-type-schema/pluginTypes';
import { summarizeValidationErrors } from '@/features/workflow-studio/task-type-schema/utils';
import { resolveTaskOutputViews } from '@/features/workflow-studio/lib/graphRouting';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import {
    TaskInputHandle,
    TaskOutputHandle,
    shouldShowInputLabel,
} from '@/features/workflow-studio/nodes/TaskOutputHandles';

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
    /** Handle ids on this node that should render an inline "+" add affordance. */
    addHandleIds?: string[];
};

export type TaskNodeData = {
    taskId: string;
    type: StudioTaskType | string;
    parameters: Record<string, unknown>;
    studioGraph?: TaskNodeStudioGraph;
};

function taskPreview(data: TaskNodeData): TaskPreview {
    const plugin = getTaskTypePlugin(data.type);
    if (plugin?.preview) {
        return plugin.preview(data.parameters);
    }
    return { primary: TASK_TYPE_LABELS[data.type as StudioTaskType] ?? data.type };
}

function TaskNodeComponent({ data, selected }: NodeProps & { data: TaskNodeData }) {
    const preview = taskPreview(data);
    const plugin = getTaskTypePlugin(data.type);
    const Icon = plugin?.icon;
    const isScript = data.type === 'SCRIPT_TASK';
    const isHttp = data.type === 'HTTP_TASK';

    const { onAddTaskClick, onBranchAddClick } = useCanvasActions();
    const addHandleIds = useMemo(
        () => new Set(data.studioGraph?.addHandleIds ?? []),
        [data.studioGraph?.addHandleIds],
    );

    const addClickFor = (handleId: string): (() => void) | undefined => {
        if (!addHandleIds.has(handleId)) return undefined;
        // Main-out append on the spine grows the linear chain; routing outputs
        // and off-spine main-out wire a new branch task from that handle.
        if (handleId === MAIN_OUT && data.studioGraph?.onMainSpine) {
            return onAddTaskClick ? () => onAddTaskClick() : undefined;
        }
        return onBranchAddClick ? () => onBranchAddClick(data.taskId, handleId) : undefined;
    };

    const { inputs, outputs, isRoutingTerminator } = useMemo(
        () => resolveTaskOutputViews(data),
        [data],
    );

    const nodeHeight = studioTaskNodeHeight(outputs.length, isRoutingTerminator);
    const fixedHeight = usesFixedNodeHeight(outputs.length, isRoutingTerminator);

    const summaryLine =
        preview.primary && preview.secondary
            ? `${preview.primary} · ${preview.secondary}`
            : preview.primary;

    const validationSummary = summarizeValidationErrors(data.studioGraph?.validationErrors ?? {});
    const hasValidationError = Boolean(validationSummary);

    const { headerHeight, bodyHeight } = ROUTING_NODE_LAYOUT;

    return (
        <div
            className={cn(
                'relative flex flex-col overflow-visible rounded-lg border bg-white shadow-sm transition-shadow',
                hasValidationError
                    ? 'border-destructive ring-2 ring-destructive/25'
                    : selected
                      ? 'border-[#0058be] ring-2 ring-[#0058be]/30'
                      : 'border-[#c6c6cd]',
            )}
            style={{
                width: TASK_NODE_OUTPUT_LAYOUT.width,
                ...(fixedHeight
                    ? { height: nodeHeight, minHeight: nodeHeight }
                    : { minHeight: nodeHeight }),
            }}
        >
            {inputs.map((input) => (
                <TaskInputHandle
                    key={input.id}
                    input={{ ...input, top: inputs.length === 1 ? '50%' : input.top }}
                    showLabel={shouldShowInputLabel(input.id)}
                />
            ))}

            <div
                className="flex shrink-0 items-center gap-2 border-b border-[#c6c6cd]/40 bg-[#f8f9ff]/50 px-2.5"
                style={{ height: headerHeight }}
            >
                <div
                    className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded text-white',
                        isRoutingTerminator
                            ? 'bg-[#7c3aed]'
                            : isScript
                              ? 'bg-[#565e74]'
                              : 'bg-[#2170e4]',
                    )}
                >
                    {Icon ? <Icon className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                </div>
                <span className="truncate text-[13px] font-bold text-[#0b1c30]">
                    {TASK_TYPE_LABELS[data.type as StudioTaskType] ?? data.type}
                </span>
            </div>

            <div
                className="flex shrink-0 flex-col justify-center overflow-hidden px-2.5"
                style={{ height: bodyHeight }}
            >
                <p className="truncate font-mono text-[10px] text-[#94a3b8]">{data.taskId}</p>
                {hasValidationError ? (
                    <p className="mt-1 flex items-start gap-1 text-[10px] font-medium text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{validationSummary}</span>
                    </p>
                ) : isRoutingTerminator ? (
                    summaryLine && (
                        <p className="mt-0.5 truncate text-[10px] text-[#6b7280]">{summaryLine}</p>
                    )
                ) : (
                    <>
                        {isHttp && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] min-w-0">
                                {preview.method && (
                                    <span className="shrink-0 rounded border border-[#2170e4]/20 bg-[#2170e4]/10 px-1.5 py-0.5 font-mono font-medium text-[#0058be]">
                                        {preview.method}
                                    </span>
                                )}
                                {preview.secondary === 'notifications' ? (
                                    <span className="flex min-w-0 items-center gap-1 text-[#45464d]">
                                        <Bell className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{preview.primary}</span>
                                    </span>
                                ) : (
                                    <span className="truncate font-mono text-[#45464d]">
                                        {preview.primary}
                                    </span>
                                )}
                            </div>
                        )}
                        {isScript && (
                            <div className="mt-1 flex items-center text-[11px] text-[#45464d] min-w-0">
                                <Code2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                <span className="truncate font-mono">{preview.primary}</span>
                            </div>
                        )}
                        {!isHttp && !isScript && (
                            <div className="mt-1 text-[11px] text-[#45464d] min-w-0">
                                <div
                                    className={cn(
                                        'truncate',
                                        data.type === 'ITERATOR_TASK' && 'font-mono',
                                    )}
                                >
                                    {preview.primary}
                                </div>
                                {preview.secondary && (
                                    <div className="truncate text-[#6b7280] font-mono text-[10px]">
                                        {preview.secondary}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {isRoutingTerminator ? (
                outputs.map((output) => (
                    <TaskOutputHandle
                        key={output.handleId}
                        output={{
                            ...output,
                            label: output.stubBehavior === 'add-task' ? '' : output.label,
                        }}
                        onAddClick={addClickFor(output.handleId)}
                    />
                ))
            ) : (
                outputs.map((output) => (
                    <TaskOutputHandle
                        key={output.handleId}
                        output={{
                            ...output,
                            label: output.handleId === MAIN_OUT ? '' : output.label,
                        }}
                        onAddClick={addClickFor(output.handleId)}
                    />
                ))
            )}
        </div>
    );
}

export const TaskNode = memo(TaskNodeComponent);
