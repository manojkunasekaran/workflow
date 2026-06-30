import type { TaskTypePlugin } from './pluginTypes';
import type { TaskParameterErrors, TaskValidationContext } from './types';
import { applyGenericFieldNormalization, validateGenericFields } from './fieldValidation';

export function getTaskTypeLabel(plugin: TaskTypePlugin): string {
    return plugin.label;
}

/** Jackson @JsonTypeInfo discriminator required inside parameters JSON. */
export function injectParameterType(
    taskType: string,
    parameters: Record<string, unknown>,
): Record<string, unknown> {
    return { ...parameters, type: taskType };
}

export function buildDefaultParameters(plugin: TaskTypePlugin): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};
    for (const field of plugin.fields) {
        if (field.defaultValue !== undefined) {
            parameters[field.key] = cloneDefault(field.defaultValue);
        }
    }
    return parameters;
}

function cloneDefault(value: unknown): unknown {
    if (Array.isArray(value)) return [...value];
    if (value !== null && typeof value === 'object') return { ...(value as Record<string, unknown>) };
    return value;
}

export function readFieldValue(parameters: Record<string, unknown>, key: string): unknown {
    return parameters[key];
}

export function writeFieldValue(
    parameters: Record<string, unknown>,
    key: string,
    value: unknown,
): Record<string, unknown> {
    return { ...parameters, [key]: value };
}

export function keyValueToRows(value: unknown): Array<{ key: string; value: string }> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [{ key: '', value: '' }];
    }
    const rows = Object.entries(value as Record<string, string>).map(([key, val]) => ({
        key,
        value: String(val),
    }));
    return rows.length > 0 ? rows : [{ key: '', value: '' }];
}

export function rowsToKeyValue(rows: Array<{ key: string; value: string }>): Record<string, string> {
    return Object.fromEntries(
        rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
    );
}

export function validateTaskParameters(
    plugin: TaskTypePlugin,
    parameters: Record<string, unknown>,
    context?: TaskValidationContext,
): { valid: boolean; errors: TaskParameterErrors } {
    const errors: TaskParameterErrors = {};
    validateGenericFields(plugin.fields, parameters, errors, context);
    plugin.validate?.(parameters, context, errors);
    return { valid: Object.keys(errors).length === 0, errors };
}

export function normalizeParametersForApply(
    plugin: TaskTypePlugin,
    parameters: Record<string, unknown>,
    context?: TaskValidationContext,
): { parameters: Record<string, unknown>; errors: TaskParameterErrors } {
    let normalized = applyGenericFieldNormalization(plugin.fields, parameters);

    const { errors, valid } = validateTaskParameters(plugin, normalized, context);
    if (!valid) {
        return { parameters: normalized, errors };
    }

    if (plugin.normalize) {
        try {
            normalized = plugin.normalize(normalized);
        } catch (error) {
            return {
                parameters: normalized,
                errors: { _form: error instanceof Error ? error.message : 'Normalization failed' },
            };
        }
    }

    return { parameters: injectParameterType(plugin.type, normalized), errors: {} };
}

/** First validation message for canvas / dialog summaries. */
export function summarizeValidationErrors(errors: TaskParameterErrors): string | null {
    const keys = Object.keys(errors);
    if (keys.length === 0) return null;
    if (keys.length === 1) return errors[keys[0]] ?? null;
    return `${keys.length} configuration issues`;
}
