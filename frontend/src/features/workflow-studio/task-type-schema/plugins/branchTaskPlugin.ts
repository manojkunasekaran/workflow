import { Split } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import type { ParallelBranchRow, TaskParameterErrors, TaskValidationContext } from '../types';
import { normalizeOptionalTaskRef } from '../taskRefs';
import { BRANCH_TASK_WIRING } from './wiring';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

function validateBranchParameters(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const branches = parameters.branches;
    if (!Array.isArray(branches) || branches.length === 0) {
        errors.branches = 'At least one parallel branch is required';
        return;
    }

    const names = new Set<string>();
    const joinTaskId = String(parameters.joinTaskId ?? '').trim();

    for (let i = 0; i < branches.length; i++) {
        const entry = branches[i];
        if (!entry || typeof entry !== 'object') {
            errors[`branches.${i}`] = 'Invalid branch entry';
            continue;
        }

        const row = entry as ParallelBranchRow;
        const branchName = String(row.branchName ?? '').trim();
        const startTaskId = String(row.startTaskId ?? '').trim();

        if (!branchName) {
            errors[`branches.${i}.branchName`] = 'Branch name is required';
        } else if (names.has(branchName)) {
            errors[`branches.${i}.branchName`] = 'Branch names must be unique';
        } else {
            names.add(branchName);
        }

        if (startTaskId && context) {
            const startTask = findWorkflowTask(context, startTaskId);
            if (!startTask) {
                errors[`branches.${i}.startTaskId`] = 'Task not found in this workflow';
            } else if (startTaskId === context.currentTaskId) {
                errors[`branches.${i}.startTaskId`] = 'Cannot start at the Split into branches task itself';
            } else if (joinTaskId && startTaskId === joinTaskId) {
                errors[`branches.${i}.startTaskId`] = 'Cannot start at the Join branches task';
            } else if (context.taskOrder && context.currentTaskId) {
                const branchIndex = context.taskOrder.indexOf(context.currentTaskId);
                const startIndex = context.taskOrder.indexOf(startTaskId);
                if (branchIndex >= 0 && startIndex >= 0 && startIndex <= branchIndex) {
                    errors[`branches.${i}.startTaskId`] =
                        'Start task must come after Split into branches in the workflow';
                }
            }
        }
    }

    if (!joinTaskId || !context?.currentTaskId) return;

    const joinTask = findWorkflowTask(context, joinTaskId);
    if (!joinTask) return;

    if (joinTask.type !== 'JOIN') {
        errors.joinTaskId = 'Must reference a Join branches task';
        return;
    }

    const joinBranchRef = joinTask.parameters.branchTaskId;
    if (
        joinBranchRef != null &&
        String(joinBranchRef).trim() !== '' &&
        String(joinBranchRef) !== context.currentTaskId
    ) {
        errors.joinTaskId = `Join branches task "${joinTaskId}" references split "${joinBranchRef}", not this task`;
    }
}

export const branchTaskPlugin = defineTaskPlugin({
    type: 'BRANCH',
    label: 'Split into branches',
    icon: Split,
    accentColor: '#d97706',
    defaultTaskId: 'branch_task',
    wiring: BRANCH_TASK_WIRING,
    fields: [
        {
            key: 'branches',
            label: 'Branches',
            type: 'branchList',
            required: true,
            defaultValue: [{ branchName: 'Branch 1', startTaskId: '' }],
        },
    ],
    validate(parameters, context, errors) {
        validateBranchParameters(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        if (Array.isArray(next.branches)) {
            next.branches = (next.branches as ParallelBranchRow[]).map((row) => ({
                branchName: String(row.branchName ?? '').trim(),
                startTaskId: normalizeOptionalTaskRef(row.startTaskId),
                endTaskId: normalizeOptionalTaskRef(row.endTaskId),
            }));
        }
        next.joinTaskId = normalizeOptionalTaskRef(next.joinTaskId);
        delete next.nextTaskId;
        return next;
    },
    preview(params) {
        const branchList = Array.isArray(params.branches) ? params.branches : [];
        const count = branchList.length;
        const join = params.joinTaskId ? 'Join connected' : 'No join';
        return {
            primary: count === 1 ? '1 branch' : `${count} branches`,
            secondary: join,
        };
    },
    executionSummary({ parameters, executionData }) {
        const data = recordFromUnknown(executionData);
        const branchIds = Array.isArray(data?.branchIds) ? data.branchIds : [];
        return {
            lines: [
                {
                    label: 'Branches',
                    value: formatPrimitive(data?.branchesCreated ?? branchIds.length),
                },
                { label: 'Join step', value: formatPrimitive(data?.joinTaskId ?? parameters.joinTaskId) },
                { label: 'Started', value: formatPrimitive(data?.branchStartTime) },
            ],
        };
    },
});
