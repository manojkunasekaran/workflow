import { Merge } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { JOIN_FAILURE_STRATEGIES } from './shared';
import type { TaskParameterErrors, TaskValidationContext } from '../types';
import { JOIN_TASK_WIRING } from './wiring';

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
    defaultTaskId: 'join_task',
    wiring: JOIN_TASK_WIRING,
    fields: [
        {
            key: 'branchTaskId',
            label: 'Split node',
            type: 'wiredRef',
            required: true,
            description: 'The Split into branches task whose parallel paths merge here.',
        },
        {
            key: 'failureStrategy',
            label: 'When branches fail',
            type: 'select',
            defaultValue: 'FAIL_FAST',
            options: [...JOIN_FAILURE_STRATEGIES],
            description:
                'Drag from each branch’s last task (Next / main-out) into the Branches input on this node.',
        },
        {
            key: 'nextTaskId',
            label: 'Next step',
            type: 'wiredRef',
            description: 'Drag from the Next handle after branches complete.',
        },
    ],
    validate(parameters, context, errors) {
        validateJoinParameters(parameters, errors, context);
    },
    preview(params) {
        const branch = params.branchTaskId ? String(params.branchTaskId) : 'select split';
        const strategy = String(params.failureStrategy ?? 'FAIL_FAST').replace(/_/g, ' ').toLowerCase();
        return { primary: `← ${branch}`, secondary: strategy };
    },
});
