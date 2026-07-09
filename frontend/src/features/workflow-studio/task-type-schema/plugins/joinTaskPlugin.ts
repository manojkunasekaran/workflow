import { Merge } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { normalizeOptionalTaskRef } from '../taskRefs';
import { JOIN_FAILURE_STRATEGIES } from './shared';
import type { TaskParameterErrors, TaskValidationContext } from '../types';
import { JOIN_TASK_WIRING } from './wiring';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

const FAILURE_STRATEGY_SET = new Set<string>(JOIN_FAILURE_STRATEGIES.map((s) => s.value));

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

function validateJoinParameters(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const strategy = parameters.failureStrategy;
    if (
        strategy !== undefined &&
        strategy !== null &&
        strategy !== '' &&
        !FAILURE_STRATEGY_SET.has(String(strategy))
    ) {
        errors.failureStrategy = 'Invalid failure strategy';
    }

    if (!context?.currentTaskId) return;

    const branchTaskId = String(parameters.branchTaskId ?? '').trim();
    if (!branchTaskId) return;

    const branchTask = findWorkflowTask(context, branchTaskId);
    if (!branchTask || branchTask.type !== 'BRANCH') return;

    const branchJoinTarget = branchTask.parameters.joinTaskId;
    if (
        branchJoinTarget != null &&
        String(branchJoinTarget).trim() !== '' &&
        String(branchJoinTarget) !== context.currentTaskId
    ) {
        errors.branchTaskId = `Split into branches task "${branchTaskId}" points to join task "${branchJoinTarget}", not this task`;
    }
}

export const joinTaskPlugin = defineTaskPlugin({
    type: 'JOIN',
    label: 'Join branches',
    icon: Merge,
    accentColor: '#059669',
    defaultTaskId: 'join_task',
    wiring: JOIN_TASK_WIRING,
    fields: [
        {
            key: 'failureStrategy',
            label: 'When branches fail',
            type: 'select',
            defaultValue: 'FAIL_FAST',
            options: [...JOIN_FAILURE_STRATEGIES],
            description:
                'Drag from each branch’s last task (Next / main-out) into the Branches input on this node.',
        },
    ],
    validate(parameters, context, errors) {
        validateJoinParameters(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        next.branchTaskId = normalizeOptionalTaskRef(next.branchTaskId);
        next.nextTaskId = normalizeOptionalTaskRef(next.nextTaskId);
        return next;
    },
    preview(params) {
        const branch = params.branchTaskId ? 'connected' : 'not connected';
        const strategy = String(params.failureStrategy ?? 'FAIL_FAST').replace(/_/g, ' ').toLowerCase();
        return { primary: `Split ${branch}`, secondary: strategy };
    },
    executionSummary({ executionData }) {
        const data = recordFromUnknown(executionData);
        const total = data?.totalBranches;
        const success = data?.successfulBranches;
        const failed = data?.failedBranches;
        return {
            lines: [
                {
                    label: 'Branches',
                    value:
                        success != null && total != null
                            ? `${success} / ${total} succeeded`
                            : formatPrimitive(total),
                    tone: typeof failed === 'number' && failed > 0 ? 'warning' : 'success',
                },
                { label: 'Failed', value: formatPrimitive(failed) },
                {
                    label: 'Wait time',
                    value:
                        typeof data?.joinDurationMs === 'number'
                            ? `${data.joinDurationMs}ms`
                            : '—',
                },
            ],
        };
    },
});
