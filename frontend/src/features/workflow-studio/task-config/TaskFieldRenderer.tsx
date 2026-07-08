import { Trash2 } from 'lucide-react';
import { BranchListField } from '@/features/workflow-studio/task-config/BranchListField';
import { ConditionalBranchListField } from '@/features/workflow-studio/task-config/ConditionalBranchListField';
import { HumanActionListField } from '@/features/workflow-studio/task-config/HumanActionListField';
import { WaitDurationField } from '@/features/workflow-studio/task-config/WaitDurationField';
import { TaskRefField } from '@/features/workflow-studio/task-config/TaskRefField';
import { filterTaskPickCandidates, taskLabelById } from '@/features/workflow-studio/task-config/taskRefUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TaskFieldSchema, TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { useTaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import {
    keyValueToRows,
    readFieldValue,
    rowsToKeyValue,
    writeFieldValue,
} from '@/features/workflow-studio/task-type-schema/utils';
import {
    STUDIO_GHOST_DESTRUCTIVE_CLASS,
    STUDIO_TEXT_LINK_INLINE_CLASS,
} from '@/features/workflow-studio/constants/studioUi';
import { cn } from '@/lib/utils';

interface TaskFieldRendererProps {
    field: TaskFieldSchema;
    parameters: Record<string, unknown>;
    onChange: (parameters: Record<string, unknown>) => void;
    error?: string;
    fieldErrors?: TaskParameterErrors;
}

export function TaskFieldRenderer({
    field,
    parameters,
    onChange,
    error,
    fieldErrors = {},
}: TaskFieldRendererProps) {
    const { workflowTasks, currentTaskId } = useTaskConfigContext();
    const value = readFieldValue(parameters, field.key);

    const update = (nextValue: unknown) => {
        onChange(writeFieldValue(parameters, field.key, nextValue));
    };

    const label = (
        <label className="text-xs font-medium text-foreground" htmlFor={field.key}>
            {field.label}
        </label>
    );

    if (field.type === 'segmented' && field.options) {
        const current = String(value ?? field.defaultValue ?? '');
        return (
            <div className="space-y-1.5">
                {label}
                <div className="flex rounded-md bg-muted p-1" role="group" aria-label={field.label}>
                    {field.options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => update(option.value)}
                            className={cn(
                                'flex-1 rounded-sm py-1 text-xs font-semibold transition-colors',
                                current === option.value
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                {field.description && (
                    <p className="text-[11px] text-muted-foreground">{field.description}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'select' && field.options) {
        const current = String(value ?? field.defaultValue ?? '');
        const selectedOption = field.options.find((option) => option.value === current);
        return (
            <div className="space-y-1.5">
                {label}
                <SimpleSelect
                    id={field.key}
                    value={current}
                    onValueChange={(next) => update(next)}
                    options={field.options.map((option) => ({
                        value: option.value,
                        label: option.label,
                    }))}
                    placeholder="Select…"
                />
                {(selectedOption?.description || field.description) && (
                    <p className="text-[11px] text-muted-foreground">
                        {selectedOption?.description ?? field.description}
                    </p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'waitDuration') {
        return (
            <WaitDurationField
                id={field.key}
                label={label}
                valueMs={value}
                onChange={(durationMs) => update(durationMs)}
                error={error}
            />
        );
    }

    if (field.type === 'wiredRef') {
        const wired = String(value ?? '').trim();
        const wiredLabel = wired ? taskLabelById(workflowTasks, wired) : '';
        return (
            <div className="space-y-1.5">
                {label}
                <p
                    className={
                        wired
                            ? 'rounded-md border border-sky-500/30 bg-sky-50 px-3 py-2 text-xs text-sky-900'
                            : 'rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground'
                    }
                >
                    {wired
                        ? `Connected to “${wiredLabel}” — add more steps with + on the canvas`
                        : (field.description ??
                          'Not connected yet — wire from an output handle on the canvas')}
                </p>
                {field.description && (
                    <p className="text-[11px] text-muted-foreground">{field.description}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'taskRef') {
        const current = String(value ?? '');
        const candidates = filterTaskPickCandidates(workflowTasks, {
            filterTypes: field.filterTypes,
            excludeTaskIds: field.excludeSelf && currentTaskId ? [currentTaskId] : [],
        });

        return (
            <TaskRefField
                id={field.key}
                label={field.label}
                value={current}
                onChange={(taskId) => update(taskId)}
                candidates={candidates}
                required={field.required}
                description={field.description}
                error={error}
                emptyOptionLabel="— None —"
            />
        );
    }

    if (field.type === 'branchList') {
        return (
            <BranchListField
                fieldKey={field.key}
                label={field.label}
                description={field.description}
                value={value}
                onChange={(branches) => update(branches)}
                errors={fieldErrors}
            />
        );
    }

    if (field.type === 'conditionalBranchList') {
        return (
            <ConditionalBranchListField
                fieldKey={field.key}
                label={field.label}
                description={field.description}
                value={value}
                onChange={(branches) => update(branches)}
                errors={fieldErrors}
            />
        );
    }

    if (field.type === 'humanActionList') {
        return (
            <HumanActionListField
                fieldKey={field.key}
                label={field.label}
                description={field.description}
                value={value}
                onChange={(actions) => update(actions)}
                errors={fieldErrors}
            />
        );
    }

    if (field.type === 'textarea') {
        return (
            <div className="space-y-1.5">
                {label}
                <Textarea
                    id={field.key}
                    value={String(value ?? '')}
                    onChange={(e) => update(e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 4}
                    className={cn('resize-y text-sm', field.mono && 'font-mono text-xs')}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'number') {
        return (
            <div className="space-y-1.5">
                {label}
                <Input
                    id={field.key}
                    type="number"
                    min={field.min}
                    value={value === undefined || value === null ? '' : String(value)}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            update(undefined);
                            return;
                        }
                        const num = Number(raw);
                        update(Number.isNaN(num) ? raw : num);
                    }}
                    placeholder={field.placeholder}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'keyValue') {
        const rows = keyValueToRows(value);
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    {label}
                    <button
                        type="button"
                        onClick={() => update(rowsToKeyValue([...rows, { key: '', value: '' }]))}
                        className={STUDIO_TEXT_LINK_INLINE_CLASS}
                    >
                        + Add row
                    </button>
                </div>
                <div className="space-y-2">
                    {rows.map((row, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                value={row.key}
                                onChange={(e) => {
                                    const next = [...rows];
                                    next[index] = { ...row, key: e.target.value };
                                    update(rowsToKeyValue(next));
                                }}
                                placeholder="Key"
                                className="font-mono text-sm"
                            />
                            <Input
                                value={row.value}
                                onChange={(e) => {
                                    const next = [...rows];
                                    next[index] = { ...row, value: e.target.value };
                                    update(rowsToKeyValue(next));
                                }}
                                placeholder="Value"
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn('shrink-0', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
                                onClick={() => update(rowsToKeyValue(rows.filter((_, i) => i !== index)))}
                                aria-label="Remove row"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    if (field.type === 'json') {
        const jsonText =
            typeof value === 'string' ? value : JSON.stringify(value ?? field.defaultValue ?? null, null, 2);
        return (
            <div className="space-y-1.5">
                {label}
                <Textarea
                    id={field.key}
                    value={jsonText}
                    onChange={(e) => update(e.target.value)}
                    className="min-h-[160px] resize-y font-mono text-xs"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {label}
            <Input
                id={field.key}
                value={String(value ?? '')}
                onChange={(e) => update(e.target.value)}
                placeholder={field.placeholder}
                className={cn('text-sm', field.mono && 'font-mono')}
            />
            {field.description && (
                <p className="text-[11px] text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export type { TaskParameterErrors };
