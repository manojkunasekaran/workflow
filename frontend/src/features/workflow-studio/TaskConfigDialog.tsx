import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Code2, Trash2, X } from 'lucide-react';
import type { Edge } from '@xyflow/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import { VariableExplorerContext } from '@/features/workflow-studio/task-config/VariableExplorerContext';
import { TaskParametersForm } from '@/features/workflow-studio/task-config/TaskParametersForm';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import {
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
    STUDIO_INPUT_FOCUS_CLASS,
} from '@/features/workflow-studio/constants/studioUi';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { WorkflowInput, VariableValue } from '@/types/api';

interface TaskConfigDialogProps {
    open: boolean;
    task: TaskNodeData | null;
    isNewTask?: boolean;
    workflowTasks?: TaskValidationContext['workflowTasks'];
    taskOrder?: string[];
    /** Live React Flow canvas nodes — for graph-aware variable explorer */
    nodes?: StudioCanvasNode[];
    /** Live React Flow canvas edges — for graph-aware variable explorer */
    edges?: Edge[];
    workflowInputs?: WorkflowInput[];
    workflowVariables?: Record<string, VariableValue>;
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
    nodes = [],
    edges = [],
    workflowInputs,
    workflowVariables,
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

    const stepName = draft?.displayName ?? '';
    const stepNamePlaceholder = draft ? taskTypeLabel(draft.type) : 'Step name';
    const TaskIcon = plugin?.icon ?? Code2;
    const taskAccentColor = plugin?.accentColor ?? '#64748b';
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
                data-testid="task-config-dialog"
                blocking={false}
                className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg"
                onOpenAutoFocus={(event) => event.preventDefault()}
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
                        <VariableExplorerContext.Provider
                            value={{
                                currentNodeId: draft.taskId,
                                nodes,
                                edges,
                                workflowInputs,
                                workflowVariables,
                            }}
                        >
                        <div 
                            className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"
                            style={{ borderTopColor: `${taskAccentColor}55`, borderTopWidth: 3 }}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                {plugin ? (
                                    <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                        style={{
                                            backgroundColor: `${taskAccentColor}18`,
                                            color: taskAccentColor,
                                        }}
                                        aria-hidden
                                    >
                                        <TaskIcon className="h-4 w-4" />
                                    </span>
                                ) : (
                                    <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                                        aria-hidden
                                    >
                                        <Code2 className="h-4 w-4" />
                                    </span>
                                )}
                                <DialogTitle asChild>
                                    <input
                                        value={stepName}
                                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                                        placeholder={stepNamePlaceholder}
                                        size={Math.min(
                                            Math.max(stepName.length || stepNamePlaceholder.length, 12),
                                            40,
                                        )}
                                        className={cn(
                                            'w-auto min-w-[10ch] max-w-[16rem] rounded-md border border-transparent bg-transparent px-2 py-1',
                                            'text-lg font-bold text-foreground outline-none transition-colors [field-sizing:content]',
                                            'placeholder:font-bold placeholder:text-foreground/90',
                                            'hover:border-border hover:bg-muted/45',
                                            STUDIO_INPUT_FOCUS_CLASS,
                                        )}
                                        aria-label="Step name"
                                    />
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
                            {plugin && (
                                <TaskParametersForm
                                    plugin={plugin}
                                    parameters={draft.parameters}
                                    onChange={handleParametersChange}
                                    errors={errors}
                                />
                            )}
                        </div>
                        </VariableExplorerContext.Provider>
                    </TaskConfigContext.Provider>
                )}
            </DialogContent>
        </Dialog>
    );
}
