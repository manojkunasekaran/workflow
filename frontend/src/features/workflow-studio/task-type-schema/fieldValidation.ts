import type { TaskFieldSchema, TaskParameterErrors, TaskValidationContext } from './types';

const COMPOSITE_FIELD_TYPES = new Set([
    'taskRef',
    'branchList',
    'conditionalBranchList',
    'humanActionList',
    'iteratorActionList',
    'wiredRef',
]);

function isEmptyValue(value: unknown): boolean {
    return value === undefined || value === null || value === '';
}

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

function validateNumberField(
    field: { key: string; label: string; min?: number },
    value: unknown,
    errors: TaskParameterErrors,
): void {
    if (isEmptyValue(value)) return;
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
        errors[field.key] = `${field.label} must be a number`;
        return;
    }
    if (field.min !== undefined && num < field.min) {
        errors[field.key] = `${field.label} must be at least ${field.min}`;
    }
}

function validateTaskRefField(
    field: TaskFieldSchema,
    value: unknown,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const taskId = typeof value === 'string' ? value.trim() : '';
    if (!taskId) {
        if (field.required) {
            errors[field.key] = `${field.label} is required`;
        }
        return;
    }

    if (!context) return;

    const target = findWorkflowTask(context, taskId);
    if (!target) {
        errors[field.key] = 'Task not found in this workflow';
        return;
    }

    if (field.filterTypes?.length && !field.filterTypes.includes(target.type)) {
        errors[field.key] = `Must reference a ${field.filterTypes.join(' or ')} task`;
    }
}

export function validateGenericFields(
    fields: TaskFieldSchema[],
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    for (const field of fields) {
        const value = parameters[field.key];

        if (COMPOSITE_FIELD_TYPES.has(field.type)) {
            continue;
        }

        if (field.type === 'taskRef') {
            validateTaskRefField(field, value, errors, context);
            continue;
        }

        if (field.required && isEmptyValue(value)) {
            errors[field.key] = `${field.label} is required`;
            continue;
        }

        if (field.type === 'number') {
            validateNumberField(field, value, errors);
        }

        if (field.type === 'json') {
            const raw = typeof value === 'string' ? value : JSON.stringify(value ?? null);
            try {
                JSON.parse(raw);
            } catch {
                errors[field.key] = 'Invalid JSON';
            }
        }
    }
}

export function applyGenericFieldNormalization(
    fields: TaskFieldSchema[],
    parameters: Record<string, unknown>,
): Record<string, unknown> {
    const normalized = { ...parameters };

    for (const field of fields) {
        if (field.type === 'taskRef' && isEmptyValue(normalized[field.key])) {
            normalized[field.key] = null;
        }

        if (field.type === 'json') {
            const value = normalized[field.key];
            if (typeof value === 'string' && value.trim()) {
                try {
                    normalized[field.key] = JSON.parse(value);
                } catch {
                    // validation will catch invalid JSON
                }
            } else if (isEmptyValue(value)) {
                normalized[field.key] = null;
            }
        }

        if (
            (field.key === 'timeoutMs' || field.key === 'maxMemoryMb' || field.key === 'credentialId') &&
            isEmptyValue(normalized[field.key])
        ) {
            normalized[field.key] = null;
        }
    }

    return normalized;
}
