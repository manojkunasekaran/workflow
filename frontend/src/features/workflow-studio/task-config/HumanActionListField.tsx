import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    HUMAN_OUTCOMES,
    parseHumanActions,
    type HumanActionRow,
} from '@/features/workflow-studio/task-type-schema/humanTask';
import type {
    TaskParameterErrors,
    TaskValidationContext,
} from '@/features/workflow-studio/task-type-schema/types';

interface HumanActionListFieldProps {
    fieldKey: string;
    label: string;
    value: unknown;
    onChange: (actions: HumanActionRow[]) => void;
    errors?: TaskParameterErrors;
    workflowTasks?: TaskValidationContext['workflowTasks'];
    currentTaskId?: string;
}

export function HumanActionListField({
    fieldKey,
    label,
    value,
    onChange,
    errors = {},
    workflowTasks = [],
    currentTaskId,
}: HumanActionListFieldProps) {
    const actions = parseHumanActions(value);
    const taskCandidates = workflowTasks.filter((task) => task.taskId !== currentTaskId);

    const update = (index: number, patch: Partial<HumanActionRow>) => {
        onChange(actions.map((action, i) => (i === index ? { ...action, ...patch } : action)));
    };

    const addAction = () => {
        onChange([
            ...actions,
            {
                id: `action_${actions.length + 1}`,
                label: 'New action',
                outcome: 'APPROVED',
                nextTaskId: '',
            },
        ]);
    };

    const removeAction = (index: number) => {
        if (actions.length <= 1) return;
        onChange(actions.filter((_, i) => i !== index));
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
                    Add action
                </button>
            </div>

            <div className="space-y-2">
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2"
                    >
                        <div className="flex items-center justify-between sm:col-span-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Action {index + 1}
                            </span>
                            {actions.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeAction(index)}
                                    aria-label={`Remove action ${index + 1}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium">ID</label>
                            <Input
                                value={action.id}
                                onChange={(e) => update(index, { id: e.target.value })}
                                className="font-mono text-xs"
                                placeholder="approve"
                            />
                            {errors[`${fieldKey}.${index}.id`] && (
                                <p className="text-xs text-destructive">{errors[`${fieldKey}.${index}.id`]}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium">Label</label>
                            <Input
                                value={action.label}
                                onChange={(e) => update(index, { label: e.target.value })}
                                className="text-sm"
                                placeholder="Approve"
                            />
                            {errors[`${fieldKey}.${index}.label`] && (
                                <p className="text-xs text-destructive">{errors[`${fieldKey}.${index}.label`]}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium">Outcome</label>
                            <select
                                value={action.outcome}
                                onChange={(e) => update(index, { outcome: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {HUMAN_OUTCOMES.map((outcome) => (
                                    <option key={outcome.value} value={outcome.value}>
                                        {outcome.label}
                                    </option>
                                ))}
                            </select>
                            {errors[`${fieldKey}.${index}.outcome`] && (
                                <p className="text-xs text-destructive">
                                    {errors[`${fieldKey}.${index}.outcome`]}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium">Override next task</label>
                            <select
                                value={action.nextTaskId}
                                onChange={(e) => update(index, { nextTaskId: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
                            >
                                <option value="">— Use default routing —</option>
                                {taskCandidates.map((task) => (
                                    <option key={task.taskId} value={task.taskId}>
                                        {task.taskId}
                                    </option>
                                ))}
                            </select>
                            {errors[`${fieldKey}.${index}.nextTaskId`] && (
                                <p className="text-xs text-destructive">
                                    {errors[`${fieldKey}.${index}.nextTaskId`]}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {errors[fieldKey] && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
        </div>
    );
}
