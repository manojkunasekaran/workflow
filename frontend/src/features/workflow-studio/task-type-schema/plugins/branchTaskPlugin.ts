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
    if ('joinTaskId' in parameters) {
        errors.joinTaskId = 'joinTaskId is no longer supported; wire paths directly to JOIN';
    }

    const branches = parameters.branches;
    if (!Array.isArray(branches) || branches.length === 0) {
        errors.branches = 'At least one parallel branch is required';
        return;
    }

    const names = new Set<string>();

    for (let i = 0; i < branches.length; i++) {
        const entry = branches[i];
        if (!entry || typeof entry !== 'object') {
            errors[`branches.${i}`] = 'Invalid branch entry';
            continue;
        }

        const row = entry as ParallelBranchRow & { endTaskId?: string };
        if ('endTaskId' in row && row.endTaskId) {
            errors[`branches.${i}.endTaskId`] = 'endTaskId is no longer supported; use canvas wiring';
        }

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
            } else if (startTask.type === 'JOIN') {
                errors[`branches.${i}.startTaskId`] = 'Cannot start at the Join branches task';
            }
        }
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
        delete next.joinTaskId;
        if (Array.isArray(next.branches)) {
            next.branches = (next.branches as ParallelBranchRow[]).map((row) => ({
                branchName: String(row.branchName ?? '').trim(),
                startTaskId: normalizeOptionalTaskRef(row.startTaskId),
            }));
        }
        delete next.nextTaskId;
        return next;
    },
    preview(params) {
        const branchList = Array.isArray(params.branches) ? params.branches : [];
        const count = branchList.length;
        return {
            primary: count === 1 ? '1 branch' : `${count} branches`,
            secondary: 'Fan-out only',
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
                { label: 'Started', value: formatPrimitive(data?.branchStartTime) },
            ],
        };
    },
});
