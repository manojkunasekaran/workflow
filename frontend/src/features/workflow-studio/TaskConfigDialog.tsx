import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import { TaskParametersForm } from '@/features/workflow-studio/task-config/TaskParametersForm';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import {
    getTaskTypeLabel,
    injectParameterType,
    normalizeParametersForApply,
    summarizeValidationErrors,
    validateTaskParameters,
} from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskValidationContext } from '@/features/workflow-studio/task-type-schema/types';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { taskTypeLabel } from '@/features/workflow-studio/lib/taskDisplayName';
import { cn } from '@/lib/utils';
import {
    STUDIO_GHOST_DESTRUCTIVE_CLASS,
    STUDIO_GHOST_ICON_BUTTON_CLASS,
} from '@/features/workflow-studio/constants/studioUi';

interface TaskConfigDialogProps {
    open: boolean;
    task: TaskNodeData | null;
    isNewTask?: boolean;
    workflowTasks?: TaskValidationContext['workflowTasks'];
    taskOrder?: string[];
    onOpenChange: (open: boolean) => void;
    onApply: (task: TaskNodeData) => void;
    onDelete: (taskId: string) => void;
    onDraftChange?: (task: TaskNodeData | null) => void;
}

export function TaskConfigDialog({
    open,
    task,
    isNewTask = false,
    workflowTasks = [],
    taskOrder = [],
    onOpenChange,
    onApply,
    onDelete,
    onDraftChange,
}: TaskConfigDialogProps) {
    const [draft, setDraft] = useState<TaskNodeData | null>(null);
    const [errors, setErrors] = useState<TaskParameterErrors>({});

    const plugin = useMemo(() => {
        if (!draft) return undefined;
        return getTaskTypePlugin(draft.type);
    }, [draft]);

    const validationContext = useMemo<TaskValidationContext>(
        () => ({
            workflowTasks,
            taskOrder,
            currentTaskId: draft?.taskId,
            isNewTask,
        }),
        [workflowTasks, taskOrder, draft?.taskId, isNewTask],
    );

    const syncDraftToCanvas = useCallback(
        (nextDraft: TaskNodeData, nextErrors: TaskParameterErrors) => {
            if (!plugin) return;

            const { parameters: normalizedParams, errors: applyErrors } = normalizeParametersForApply(
                plugin,
                nextDraft.parameters,
                validationContext,
            );

            const hasApplyErrors = Object.keys(applyErrors).length > 0;
            const parameters = hasApplyErrors
                ? injectParameterType(plugin.type, nextDraft.parameters)
                : normalizedParams;

            const applied = { ...nextDraft, parameters };
            onApply(applied);
            onDraftChange?.(applied);
            setErrors(hasApplyErrors ? { ...nextErrors, ...applyErrors } : nextErrors);
        },
        [onApply, onDraftChange, plugin, validationContext],
    );

    useEffect(() => {
        if (!open || !task) {
            if (!open) {
                setDraft(null);
                onDraftChange?.(null);
            }
            return;
        }
        const nextDraft = { ...task, parameters: { ...task.parameters } };
        setDraft(nextDraft);
        onDraftChange?.(nextDraft);

        const taskPlugin = getTaskTypePlugin(task.type);
        if (!taskPlugin) {
            setErrors({});
            return;
        }

        const { errors: nextErrors } = validateTaskParameters(taskPlugin, nextDraft.parameters, {
            workflowTasks,
            taskOrder,
            currentTaskId: task.taskId,
            isNewTask,
        });
        setErrors(nextErrors);
    }, [open, task, onDraftChange, workflowTasks, taskOrder, isNewTask]);

    const typeLabel = plugin ? getTaskTypeLabel(plugin) : draft?.type ?? '';
    const errorSummary = summarizeValidationErrors(errors);

    const handleParametersChange = (parameters: Record<string, unknown>) => {
        if (!draft || !plugin) return;
        const nextDraft = { ...draft, parameters };
        const { errors: nextErrors } = validateTaskParameters(
            plugin,
            parameters,
            validationContext,
        );
        setDraft(nextDraft);
        syncDraftToCanvas(nextDraft, nextErrors);
    };

    const handleDisplayNameChange = (displayName: string) => {
        if (!draft) return;
        const nextDraft = { ...draft, displayName };
        setDraft(nextDraft);
        onApply(nextDraft);
        onDraftChange?.(nextDraft);
    };

    const handleDelete = () => {
        if (!draft) return;
        onDelete(draft.taskId);
        onOpenChange(false);
    };

    const unknownType = draft && !plugin;

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent
                blocking={false}
                className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg"
                onInteractOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
            >
                {!draft ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Loading task…</div>
                ) : unknownType ? (
                    <div className="p-8 text-center text-sm text-destructive">
                        Unknown task type: {draft.type}. Register a plugin in task-type-schema/plugins.
                    </div>
                ) : (
                    <TaskConfigContext.Provider value={validationContext}>
                        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                            <div className="min-w-0">
                                <DialogTitle className="text-base font-semibold text-foreground">
                                    {typeLabel}
                                </DialogTitle>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {!isNewTask && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn('h-8 w-8', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
                                        onClick={handleDelete}
                                        aria-label="Delete task"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
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

                        {errorSummary ? (
                            <div
                                className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                                role="alert"
                            >
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{errorSummary}</span>
                            </div>
                        ) : null}

                        <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-thin">
                            <div className="mb-4 space-y-1.5">
                                <label className="text-xs font-medium text-foreground" htmlFor="step-name">
                                    Step name
                                </label>
                                <Input
                                    id="step-name"
                                    value={draft.displayName ?? ''}
                                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                                    placeholder={taskTypeLabel(draft.type)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Shown on the canvas instead of the technical step id.
                                </p>
                            </div>
                            {plugin && (
                                <TaskParametersForm
                                    plugin={plugin}
                                    parameters={draft.parameters}
                                    onChange={handleParametersChange}
                                    errors={errors}
                                />
                            )}
                        </div>
                    </TaskConfigContext.Provider>
                )}
            </DialogContent>
        </Dialog>
    );
}
