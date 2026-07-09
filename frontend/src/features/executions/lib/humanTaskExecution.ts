import type { HumanActionRow } from '@/features/workflow-studio/task-type-schema/humanTask';
import { parseHumanActions } from '@/features/workflow-studio/task-type-schema/humanTask';
import { recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';
import type { WorkflowTaskExecution } from '@/api/executionApi';
import type { WorkflowTask } from '@/types/api';

export function resolveHumanActions(
    task: WorkflowTask,
    taskExecution: WorkflowTaskExecution | null,
): HumanActionRow[] {
    const data = recordFromUnknown(taskExecution?.executionData);
    const fromRun = data?.availableActions;
    if (Array.isArray(fromRun) && fromRun.length > 0) {
        return fromRun.map((item, index) => {
            const row = recordFromUnknown(item) ?? {};
            return {
                id: String(row.id ?? `action_${index + 1}`),
                label: String(row.label ?? row.id ?? 'Action'),
                outcome: String(row.outcome ?? 'APPROVED'),
                nextTaskId: String(row.nextTaskId ?? ''),
            };
        });
    }
    return parseHumanActions(task.parameters?.actions);
}

export function canRespondToHumanTask(taskExecution: WorkflowTaskExecution | null): boolean {
    return taskExecution?.taskType === 'HUMAN_TASK' && taskExecution.status === 'PAUSED';
}
