import { resolveTaskDisplayName } from '@/features/workflow-studio/lib/taskDisplayName';
import type { TaskValidationContext } from '@/features/workflow-studio/task-type-schema/types';

export type TaskPickCandidate = {
    taskId: string;
    type: string;
    displayName?: string;
    parameters?: Record<string, unknown>;
};

export function formatTaskOptionLabel(task: TaskPickCandidate): string {
    return resolveTaskDisplayName({
        displayName: task.displayName,
        type: task.type,
    });
}

export function filterTaskPickCandidates(
    workflowTasks: TaskValidationContext['workflowTasks'],
    options: {
        filterTypes?: string[];
        excludeTaskIds?: string[];
    },
): TaskPickCandidate[] {
    const exclude = new Set((options.excludeTaskIds ?? []).filter(Boolean));
    return workflowTasks.filter((task) => {
        if (exclude.has(task.taskId)) return false;
        if (options.filterTypes?.length && !options.filterTypes.includes(task.type)) {
            return false;
        }
        return true;
    });
}

export function taskLabelById(
    workflowTasks: TaskPickCandidate[],
    taskId: string,
): string {
    const task = workflowTasks.find((item) => item.taskId === taskId);
    if (!task) return taskId;
    return formatTaskOptionLabel(task);
}
