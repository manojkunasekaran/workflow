import type { TaskValidationContext } from '@/features/workflow-studio/task-type-schema/types';

export type TaskPickCandidate = {
    taskId: string;
    type: string;
};

export function formatTaskOptionLabel(task: TaskPickCandidate): string {
    const typeLabel = task.type.replace(/_TASK$/, '').replace(/_/g, ' ');
    return `${task.taskId} (${typeLabel})`;
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
