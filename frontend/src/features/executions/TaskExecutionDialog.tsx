import { useMemo } from 'react';
import { Code2, X } from 'lucide-react';
import type { WorkflowExecution, WorkflowTaskExecution } from '@/api/executionApi';
import type { WorkflowDefinition } from '@/types/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExecutionSummaryView } from '@/features/executions/ExecutionSummaryView';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { HumanTaskRespondForm } from '@/features/executions/HumanTaskRespondForm';
import { canRespondToHumanTask } from '@/features/executions/lib/humanTaskExecution';
import { formatExecutionDuration } from '@/features/executions/lib/executionDisplay';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { resolveTaskDisplayName, taskTypeLabel } from '@/features/workflow-studio/lib/taskDisplayName';
import { cn } from '@/lib/utils';
import { STUDIO_GHOST_ICON_BUTTON_CLASS } from '@/features/workflow-studio/constants/studioUi';

interface TaskExecutionDialogProps {
    open: boolean;
    taskId: string | null;
    definition: WorkflowDefinition;
    execution: WorkflowExecution;
    taskExecutions: WorkflowTaskExecution[];
    onOpenChange: (open: boolean) => void;
    onRefresh: () => void;
}

export function TaskExecutionDialog({
    open,
    taskId,
    definition,
    execution,
    taskExecutions,
    onOpenChange,
    onRefresh,
}: TaskExecutionDialogProps) {
    const task = useMemo(
        () => definition.tasks.find((item) => item.taskId === taskId) ?? null,
        [definition.tasks, taskId],
    );

    const taskExecution = useMemo(
        () => taskExecutions.find((item) => item.taskDefinitionId === taskId) ?? null,
        [taskExecutions, taskId],
    );

    const plugin = useMemo(() => (task ? getTaskTypePlugin(task.type) : undefined), [task]);

    const status = taskExecution?.status ?? 'PENDING';
    const executionSummary = useMemo(() => {
        if (!plugin || !task) return null;
        return (
            plugin.executionSummary?.({
                parameters: task.parameters,
                executionData: taskExecution?.executionData,
                errorMessage: taskExecution?.errorMessage,
                status,
            }) ?? null
        );
    }, [plugin, task, taskExecution, status]);

    const showHumanRespond = canRespondToHumanTask(taskExecution);
    const duration =
        taskExecution?.startTime
            ? formatExecutionDuration(taskExecution.startTime, taskExecution.endTime)
            : '—';

    const displayName = task
        ? resolveTaskDisplayName({
              displayName: task.parameters?.displayName as string | undefined,
              type: task.type,
          })
        : 'Step';
    const Icon = plugin?.icon ?? Code2;
    const accentColor = plugin?.accentColor ?? '#64748b';

    return (
        <Dialog open={open && Boolean(task)} onOpenChange={onOpenChange} modal={false}>
            <DialogContent
                blocking={false}
                className="flex max-h-[85vh] flex-col p-0 sm:max-w-lg"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
            >
                {task ? (
                    <>
                        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                    style={{
                                        backgroundColor: `${accentColor}18`,
                                        color: accentColor,
                                    }}
                                    aria-hidden
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <DialogTitle className="truncate text-lg font-bold">
                                        {displayName}
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {taskTypeLabel(task.type)} · {duration}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <ExecutionStatusBadge status={status} size="md" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)}
                                    onClick={() => onOpenChange(false)}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
                            {showHumanRespond && taskExecution ? (
                                <HumanTaskRespondForm
                                    executionId={execution.id}
                                    task={task}
                                    taskExecution={taskExecution}
                                    onSuccess={() => {
                                        onRefresh();
                                        onOpenChange(false);
                                    }}
                                />
                            ) : null}

                            {taskExecution?.errorMessage ? (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    {taskExecution.errorMessage}
                                </div>
                            ) : null}

                            <ExecutionSummaryView summary={executionSummary} />
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
