import type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';
import { httpTaskPlugin } from '@/features/workflow-studio/task-type-schema/plugins/httpTaskPlugin';
import { buildDefaultParameters } from '@/features/workflow-studio/task-type-schema/utils';

export const ITERATOR_NESTED_TYPES: StudioTaskType[] = [
    'HTTP_TASK',
    'SCRIPT_TASK',
    'WAIT',
    'DATA_TRANSFORM',
];

export interface IteratorActionRow {
    taskId: string;
    type: StudioTaskType;
    parameters: Record<string, unknown>;
}

export function defaultIteratorAction(index = 0): IteratorActionRow {
    const type: StudioTaskType = 'HTTP_TASK';
    return {
        taskId: index === 0 ? 'loop_action' : `loop_action_${index + 1}`,
        type,
        parameters: {
            type,
            ...buildDefaultParameters(httpTaskPlugin),
        },
    };
}

export function parseIteratorActions(value: unknown): IteratorActionRow[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [defaultIteratorAction(0)];
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return defaultIteratorAction(index);
        }
        const row = item as Record<string, unknown>;
        const type = String(row.type ?? 'HTTP_TASK') as StudioTaskType;
        const parameters =
            row.parameters && typeof row.parameters === 'object' && !Array.isArray(row.parameters)
                ? { ...(row.parameters as Record<string, unknown>) }
                : defaultIteratorAction(index).parameters;

        return {
            taskId: String(row.taskId ?? `loop_action_${index + 1}`),
            type: ITERATOR_NESTED_TYPES.includes(type) ? type : 'HTTP_TASK',
            parameters,
        };
    });
}

export function normalizeLoopOver(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.includes('{{')) return trimmed;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }
    if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
    }
    return trimmed;
}

export function normalizeIteratorActionsForApi(
    actions: IteratorActionRow[],
): Array<Record<string, unknown>> {
    return actions.map((action) => ({
        taskId: action.taskId.trim(),
        type: action.type,
        parameters: { ...action.parameters, type: action.type },
    }));
}
