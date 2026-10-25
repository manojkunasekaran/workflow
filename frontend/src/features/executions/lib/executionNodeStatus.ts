import type { WorkflowTaskExecution } from '@/api/executionApi';

export type ExecutionNodeStatus = {
    status: string;
    errorMessage?: string;
    startTime?: string;
    endTime?: string;
};

export function buildExecutionNodeStatusMap(
    taskExecutions: WorkflowTaskExecution[],
    workflowTaskIds: string[],
): Map<string, ExecutionNodeStatus> {
    const map = new Map<string, ExecutionNodeStatus>();

    for (const taskExecution of taskExecutions) {
        map.set(taskExecution.taskDefinitionId, {
            status: taskExecution.status,
            errorMessage: taskExecution.errorMessage,
            startTime: taskExecution.startTime,
            endTime: taskExecution.endTime,
        });
    }

    for (const taskId of workflowTaskIds) {
        if (!map.has(taskId)) {
            map.set(taskId, { status: 'PENDING' });
        }
    }

    return map;
}

export function executionNodeBorderClass(status: string): string | undefined {
    switch (status.toUpperCase()) {
        case 'COMPLETED':
            return 'border-success';
        case 'FAILED':
            return 'border-destructive';
        case 'RUNNING':
            return 'border-warning';
        case 'PAUSED':
            return 'border-info';
        case 'SKIPPED':
            return 'border-muted-foreground/40';
        case 'BRANCHED':
            return 'border-primary';
        default:
            return undefined;
    }
}
