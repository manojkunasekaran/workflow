import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    defaultConditionalBranch,
    defaultRuleCondition,
    operatorNeedsValue,
    parseConditionalBranches,
    RULE_OPERATORS,
    type ConditionalBranchRow,
    type ConditionalConditionMode,
    type RuleConditionRow,
} from '@/features/workflow-studio/task-type-schema/conditionalBranch';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import {
    STUDIO_GHOST_DESTRUCTIVE_CLASS,
    STUDIO_TEXT_LINK_CLASS,
    STUDIO_TEXT_LINK_INLINE_CLASS,
} from '@/features/workflow-studio/constants/studioUi';
import { cn } from '@/lib/utils';
interface ConditionalBranchListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (branches: ConditionalBranchRow[]) => void;
    errors?: TaskParameterErrors;
}

export function ConditionalBranchListField({
    fieldKey,
    label,
    description,
    value,
    onChange,
    errors = {},
}: ConditionalBranchListFieldProps) {
    const branches = parseConditionalBranches(value);

    const updateBranches = (next: ConditionalBranchRow[]) => onChange(next);

    const updateBranch = (index: number, patch: Partial<ConditionalBranchRow>) => {
        updateBranches(branches.map((branch, i) => (i === index ? { ...branch, ...patch } : branch)));
    };

    const updateCondition = (
        branchIndex: number,
        conditionIndex: number,
        patch: Partial<RuleConditionRow>,
    ) => {
        const branch = branches[branchIndex];
        const conditions = branch.rules.conditions.map((condition, i) =>
            i === conditionIndex ? { ...condition, ...patch } : condition,
        );
        updateBranch(branchIndex, { rules: { ...branch.rules, conditions } });
    };

    const addBranch = () => {
        updateBranches([...branches, defaultConditionalBranch(branches.length)]);
    };

    const removeBranch = (index: number) => {
        if (branches.length <= 1) return;
        updateBranches(branches.filter((_, i) => i !== index));
    };

    const addCondition = (branchIndex: number) => {
        const branch = branches[branchIndex];
        updateBranch(branchIndex, {
            rules: {
                ...branch.rules,
                conditions: [...branch.rules.conditions, defaultRuleCondition()],
            },
        });
    };

    const removeCondition = (branchIndex: number, conditionIndex: number) => {
        const branch = branches[branchIndex];
        const conditions = branch.rules.conditions.filter((_, i) => i !== conditionIndex);
        updateBranch(branchIndex, {
            rules: {
                ...branch.rules,
                conditions: conditions.length > 0 ? conditions : [defaultRuleCondition()],
            },
        });
    };

    const setMode = (branchIndex: number, mode: ConditionalConditionMode) => {
        updateBranch(branchIndex, { conditionMode: mode });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{label}</label>
                <button
                    type="button"
                    onClick={addBranch}
                    className={STUDIO_TEXT_LINK_CLASS}
                >
                    <Plus className="h-3 w-3" />
                    Add branch
                </button>
            </div>

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

            <div className="space-y-3">
                {branches.map((branch, index) => {
                    const nameError = errors[`${fieldKey}.${index}.name`];
                    const nextError = errors[`${fieldKey}.${index}.nextTaskId`];
                    const expressionError = errors[`${fieldKey}.${index}.expression`];
                    const rulesError = errors[`${fieldKey}.${index}.rules`];

                    return (
                        <div
                            key={index}
                            className="rounded-md border border-border bg-muted/30 p-3 space-y-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Branch {index + 1} — first match wins
                                </span>
                                {branches.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn('h-7 w-7', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
                                        onClick={() => removeBranch(index)}
                                        aria-label={`Remove branch ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    className="text-xs font-medium text-foreground"
                                    htmlFor={`${fieldKey}-${index}-name`}
                                >
                                    Name
                                </label>
                                <Input
                                    id={`${fieldKey}-${index}-name`}
                                    value={branch.name}
                                    onChange={(e) => updateBranch(index, { name: e.target.value })}
                                    placeholder="e.g. High priority"
                                    className="text-sm"
                                />
                                {nameError && (
                                    <p className="text-xs text-destructive">{nameError}</p>
                                )}
                                {nextError && (
                                    <p className="text-xs text-destructive">{nextError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-foreground">Condition</span>
                                <div className="flex rounded-md bg-muted p-1" role="group">
                                    {(
                                        [
                                            ['expression', 'SpEL expression'],
                                            ['rules', 'Rule builder'],
                                        ] as const
                                    ).map(([mode, modeLabel]) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setMode(index, mode)}
                                            className={cn(
                                                'flex-1 rounded-sm py-1 text-xs font-semibold transition-colors',
                                                branch.conditionMode === mode
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {modeLabel}
                                        </button>
                                    ))}
                                </div>

                                {branch.conditionMode === 'expression' ? (
                                    <div className="space-y-1.5">
                                        <Textarea
                                            id={`${fieldKey}-${index}-expression`}
                                            value={branch.expression}
                                            onChange={(e) =>
                                                updateBranch(index, { expression: e.target.value })
                                            }
                                            placeholder="{{$tasks.human_task.outcome}} == 'APPROVED'"
                                            rows={3}
                                            className="resize-y font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            SpEL or template expression. Use{' '}
                                            <code className="text-[10px]">{'{{$tasks.<id>.field}}'}</code>{' '}
                                            with <code className="text-[10px]">==</code> (not ===). Evaluated when rules are not set.
                                        </p>
                                        {expressionError && (
                                            <p className="text-xs text-destructive">{expressionError}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label
                                                className="text-[11px] text-muted-foreground"
                                                htmlFor={`${fieldKey}-${index}-operator`}
                                            >
                                                Match
                                            </label>
                                            <SimpleSelect
                                                id={`${fieldKey}-${index}-operator`}
                                                value={branch.rules.operator}
                                                onValueChange={(next) =>
                                                    updateBranch(index, {
                                                        rules: {
                                                            ...branch.rules,
                                                            operator: next === 'OR' ? 'OR' : 'AND',
                                                        },
                                                    })
                                                }
                                                options={[
                                                    { value: 'AND', label: 'all conditions (AND)' },
                                                    { value: 'OR', label: 'any condition (OR)' },
                                                ]}
                                                triggerClassName="h-8 w-auto min-w-[10rem] text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addCondition(index)}
                                                className={cn('ml-auto', STUDIO_TEXT_LINK_INLINE_CLASS)}
                                            >
                                                + Add condition
                                            </button>
                                        </div>

                                        {branch.rules.conditions.map((condition, conditionIndex) => {
                                            const valueErr =
                                                errors[
                                                    `${fieldKey}.${index}.rules.${conditionIndex}.value`
                                                ];

                                            return (
                                                <div
                                                    key={conditionIndex}
                                                    className="grid gap-2 rounded border border-border/60 bg-background p-2 sm:grid-cols-[1fr_auto_auto_1fr_auto]"
                                                >
                                                    <Input
                                                        value={condition.field}
                                                        onChange={(e) =>
                                                            updateCondition(index, conditionIndex, {
                                                                field: e.target.value,
                                                            })
                                                        }
                                                        placeholder="{{$tasks.fetch.body.status}}"
                                                        className="font-mono text-xs"
                                                    />
                                                    <SimpleSelect
                                                        value={condition.operator}
                                                        onValueChange={(next) =>
                                                            updateCondition(index, conditionIndex, {
                                                                operator: next,
                                                            })
                                                        }
                                                        options={RULE_OPERATORS.map((op) => ({
                                                            value: op.value,
                                                            label: op.label,
                                                        }))}
                                                        triggerClassName="h-9 min-w-[8.5rem] text-xs"
                                                    />
                                                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <input
                                                            type="checkbox"
                                                            checked={condition.negated}
                                                            onChange={(e) =>
                                                                updateCondition(index, conditionIndex, {
                                                                    negated: e.target.checked,
                                                                })
                                                            }
                                                        />
                                                        NOT
                                                    </label>
                                                    <Input
                                                        value={condition.value}
                                                        onChange={(e) =>
                                                            updateCondition(index, conditionIndex, {
                                                                value: e.target.value,
                                                            })
                                                        }
                                                        placeholder={
                                                            condition.operator === 'BETWEEN' ||
                                                            condition.operator === 'NOT_BETWEEN'
                                                                ? '[min, max]'
                                                                : condition.operator === 'IN' ||
                                                                    condition.operator === 'NOT_IN'
                                                                  ? '["a","b"]'
                                                                  : 'value'
                                                        }
                                                        disabled={!operatorNeedsValue(condition.operator)}
                                                        className="font-mono text-xs"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn('h-8 w-8', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
                                                        onClick={() =>
                                                            removeCondition(index, conditionIndex)
                                                        }
                                                        aria-label="Remove condition"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {valueErr && (
                                                        <p className="col-span-full text-xs text-destructive">
                                                            {valueErr}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {rulesError && (
                                            <p className="text-xs text-destructive">{rulesError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {errors[fieldKey] && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
        </div>
    );
}
