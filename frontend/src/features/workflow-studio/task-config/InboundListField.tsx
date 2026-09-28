import { taskLabelById } from '@/features/workflow-studio/task-config/taskRefUtils';
import { useTaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';

interface InboundListFieldProps {
    label: string;
    description?: string;
    inboundTaskIds: unknown;
}

export function InboundListField({ label, description, inboundTaskIds }: InboundListFieldProps) {
    const { workflowTasks } = useTaskConfigContext();
    const ids = Array.isArray(inboundTaskIds)
        ? inboundTaskIds.map((id) => String(id ?? '').trim()).filter(Boolean)
        : [];

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">{label}</label>
            {description ? (
                <p className="text-[11px] text-muted-foreground">{description}</p>
            ) : null}
            {ids.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    No inbounds connected — wire tasks into the Branches input on the canvas.
                </p>
            ) : (
                <ul className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
                    {ids.map((taskId) => (
                        <li
                            key={taskId}
                            className="rounded border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground"
                        >
                            {taskLabelById(workflowTasks, taskId)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
