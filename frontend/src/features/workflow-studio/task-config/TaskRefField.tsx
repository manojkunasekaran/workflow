import type { TaskPickCandidate } from '@/features/workflow-studio/task-config/taskRefUtils';
import { formatTaskOptionLabel } from '@/features/workflow-studio/task-config/taskRefUtils';

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
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value || null)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                {!required && <option value="">{emptyOptionLabel}</option>}
                {candidates.map((task) => (
                    <option key={task.taskId} value={task.taskId}>
                        {formatTaskOptionLabel(task)}
                    </option>
                ))}
            </select>
            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
            {required && candidates.length === 0 && (
                <p className="text-[11px] text-amber-700">No matching tasks in this workflow yet.</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
