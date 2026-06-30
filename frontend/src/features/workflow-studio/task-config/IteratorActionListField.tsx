import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TASK_TYPE_LABELS, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import { TaskParametersForm } from '@/features/workflow-studio/task-config/TaskParametersForm';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import {
    defaultIteratorAction,
    ITERATOR_NESTED_TYPES,
    parseIteratorActions,
    type IteratorActionRow,
} from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { buildDefaultParameters } from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';

interface IteratorActionListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (actions: IteratorActionRow[]) => void;
    errors?: TaskParameterErrors;
}

export function IteratorActionListField({
    fieldKey,
    label,
    description,
    value,
    onChange,
    errors = {},
}: IteratorActionListFieldProps) {
    const actions = parseIteratorActions(value);

    const updateActions = (next: IteratorActionRow[]) => onChange(next);

    const updateAction = (index: number, patch: Partial<IteratorActionRow>) => {
        updateActions(actions.map((action, i) => (i === index ? { ...action, ...patch } : action)));
    };

    const setType = (index: number, type: StudioTaskType) => {
        const plugin = getTaskTypePlugin(type);
        updateAction(index, {
            type,
            parameters: {
                type,
                ...(plugin ? buildDefaultParameters(plugin) : {}),
            },
        });
    };

    const addAction = () => {
        updateActions([...actions, defaultIteratorAction(actions.length)]);
    };

    const removeAction = (index: number) => {
        if (actions.length <= 1) return;
        updateActions(actions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{label}</label>
                <button
                    type="button"
                    onClick={addAction}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                    <Plus className="h-3 w-3" />
                    Add sub-task
                </button>
            </div>

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

            <div className="space-y-3">
                {actions.map((action, index) => {
                    const plugin = getTaskTypePlugin(action.type);
                    const nestedErrors: TaskParameterErrors = {};
                    for (const [key, message] of Object.entries(errors)) {
                        const prefix = `${fieldKey}.${index}.parameters.`;
                        if (key.startsWith(prefix)) {
                            nestedErrors[key.slice(prefix.length)] = message;
                        }
                    }

                    return (
                        <div
                            key={index}
                            className="rounded-md border border-border bg-muted/30 p-3 space-y-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sub-task {index + 1}
                                </span>
                                {actions.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeAction(index)}
                                        aria-label={`Remove sub-task ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-foreground">Task ID</label>
                                    <Input
                                        value={action.taskId}
                                        onChange={(e) => updateAction(index, { taskId: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                    {errors[`${fieldKey}.${index}.taskId`] && (
                                        <p className="text-xs text-destructive">
                                            {errors[`${fieldKey}.${index}.taskId`]}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-foreground">Type</label>
                                    <select
                                        value={action.type}
                                        onChange={(e) => setType(index, e.target.value as StudioTaskType)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {ITERATOR_NESTED_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {TASK_TYPE_LABELS[type]}
                                            </option>
                                        ))}
                                    </select>
                                    {errors[`${fieldKey}.${index}.type`] && (
                                        <p className="text-xs text-destructive">
                                            {errors[`${fieldKey}.${index}.type`]}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {plugin && (
                                <div className="rounded border border-border/60 bg-background p-3">
                                    <TaskParametersForm
                                        plugin={plugin}
                                        parameters={action.parameters}
                                        onChange={(parameters) => updateAction(index, { parameters })}
                                        errors={nestedErrors}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {errors[fieldKey] && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
        </div>
    );
}
