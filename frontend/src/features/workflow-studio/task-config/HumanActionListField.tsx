import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import {
    HUMAN_OUTCOMES,
    parseHumanActions,
    type HumanActionRow,
} from '@/features/workflow-studio/task-type-schema/humanTask';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import {
    STUDIO_GHOST_DESTRUCTIVE_CLASS,
    STUDIO_TEXT_LINK_CLASS,
} from '@/features/workflow-studio/constants/studioUi';
import { cn } from '@/lib/utils';

interface HumanActionListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (actions: HumanActionRow[]) => void;
    errors?: TaskParameterErrors;
}

export function HumanActionListField({
    fieldKey,
    label,
    description,
    value,
    onChange,
    errors = {},
}: HumanActionListFieldProps) {
    const actions = parseHumanActions(value);

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
                <button type="button" onClick={addAction} className={STUDIO_TEXT_LINK_CLASS}>
                    <Plus className="h-3 w-3" />
                    Add action
                </button>
            </div>
            {description ? (
                <p className="text-[11px] text-muted-foreground">{description}</p>
            ) : null}

            <div className="space-y-2">
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-3"
                    >
                        <div className="flex items-center justify-between sm:col-span-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Action {index + 1}
                            </span>
                            {actions.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn('h-7 w-7', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
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
                            <SimpleSelect
                                value={action.outcome}
                                onValueChange={(next) => update(index, { outcome: next })}
                                options={HUMAN_OUTCOMES.map((outcome) => ({
                                    value: outcome.value,
                                    label: outcome.label,
                                }))}
                            />
                            {errors[`${fieldKey}.${index}.outcome`] && (
                                <p className="text-xs text-destructive">
                                    {errors[`${fieldKey}.${index}.outcome`]}
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
