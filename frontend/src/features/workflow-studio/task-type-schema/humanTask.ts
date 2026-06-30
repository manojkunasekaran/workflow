import type { TaskParameterErrors, TaskValidationContext } from './types';

export const HUMAN_OUTCOMES = [
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PENDING', label: 'Pending' },
] as const;

export interface HumanActionRow {
    id: string;
    label: string;
    outcome: string;
    nextTaskId: string;
}

const OUTCOME_SET = new Set<string>(HUMAN_OUTCOMES.map((o) => o.value));

export function defaultHumanActions(): HumanActionRow[] {
    return [
        { id: 'approve', label: 'Approve', outcome: 'APPROVED', nextTaskId: '' },
        { id: 'reject', label: 'Reject', outcome: 'REJECTED', nextTaskId: '' },
    ];
}

export function parseHumanActions(value: unknown): HumanActionRow[] {
    if (!Array.isArray(value) || value.length === 0) {
        return defaultHumanActions();
    }
    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return { id: `action_${index + 1}`, label: '', outcome: 'APPROVED', nextTaskId: '' };
        }
        const row = item as Record<string, unknown>;
        return {
            id: String(row.id ?? ''),
            label: String(row.label ?? ''),
            outcome: String(row.outcome ?? 'APPROVED'),
            nextTaskId: String(row.nextTaskId ?? ''),
        };
    });
}

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

export function validateHumanTaskParameters(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const actions = parseHumanActions(parameters.actions);
    if (actions.length === 0) {
        errors.actions = 'At least one action is required';
        return;
    }

    const ids = new Set<string>();
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const id = action.id.trim();
        const label = action.label.trim();
        const nextTaskId = action.nextTaskId.trim();

        if (!id) {
            errors[`actions.${i}.id`] = 'Action ID is required';
        } else if (ids.has(id)) {
            errors[`actions.${i}.id`] = 'Action IDs must be unique';
        } else {
            ids.add(id);
        }

        if (!label) {
            errors[`actions.${i}.label`] = 'Label is required';
        }

        if (!OUTCOME_SET.has(action.outcome)) {
            errors[`actions.${i}.outcome`] = 'Invalid outcome';
        }

        if (nextTaskId && context) {
            if (nextTaskId === context.currentTaskId) {
                errors[`actions.${i}.nextTaskId`] = 'Cannot route to this task';
            } else if (!findWorkflowTask(context, nextTaskId)) {
                errors[`actions.${i}.nextTaskId`] = 'Task not found in this workflow';
            }
        }
    }

    for (const key of ['approvedNextTaskId', 'rejectedNextTaskId'] as const) {
        const raw = parameters[key];
        if (raw === null || raw === undefined || raw === '') continue;
        const taskId = String(raw).trim();
        if (context?.currentTaskId && taskId === context.currentTaskId) {
            errors[key] = 'Cannot route to this task';
        } else if (context && !findWorkflowTask(context, taskId)) {
            errors[key] = 'Task not found in this workflow';
        }
    }
}

export function normalizeHumanActionsForApi(actions: HumanActionRow[]): Array<Record<string, unknown>> {
    return actions.map((action) => ({
        id: action.id.trim(),
        label: action.label.trim(),
        outcome: action.outcome,
        nextTaskId: action.nextTaskId.trim() || null,
    }));
}
