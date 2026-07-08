import type { TaskPickCandidate } from '@/features/workflow-studio/task-config/taskRefUtils';
import { formatTaskOptionLabel } from '@/features/workflow-studio/task-config/taskRefUtils';
import { SimpleSelect } from '@/components/ui/select';

interface TaskRefFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (taskId: string | null) => void;
    candidates: TaskPickCandidate[];
    required?: boolean;
    description?: string;
    error?: string;
    emptyOptionLabel?: string;
}

export function TaskRefField({
    id,
    label,
    value,
    onChange,
    candidates,
    required = false,
    description,
    error,
    emptyOptionLabel = '— None —',
}: TaskRefFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor={id}>
                {label}
            </label>
            <SimpleSelect
                id={id}
                value={value}
                onValueChange={(next) => onChange(next || null)}
                options={candidates.map((task) => ({
                    value: task.taskId,
                    label: formatTaskOptionLabel(task),
                }))}
                allowEmpty={!required}
                emptyLabel={emptyOptionLabel}
                placeholder={emptyOptionLabel}
            />
            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
            {required && candidates.length === 0 && (
                <p className="text-[11px] text-amber-700">No matching tasks in this workflow yet.</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
