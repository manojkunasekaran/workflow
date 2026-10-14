import type { WorkflowDefinition } from '@/types/api';
import type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';
import { httpTaskPlugin } from '@/features/workflow-studio/task-type-schema/plugins/httpTaskPlugin';
import { buildDefaultParameters, injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import { normalizeOptionalTaskRef } from './taskRefs';
import type { TaskParameterErrors, TaskValidationContext } from './types';

export const ITERATOR_NESTED_TYPES: StudioTaskType[] = [
    'HTTP_TASK',
    'SCRIPT_TASK',
    'WAIT',
    'DATA_TRANSFORM',
];

/** Must match backend IteratorTaskConstraints.MAX_ITERATIONS */
export const MAX_ITERATOR_ITERATIONS = 1000;

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
        return [];
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
            type,
            parameters,
        };
    });
}

/** True when a static loopOver value cannot be iterated by the backend executor. */
export function isInvalidStaticLoopOver(value: unknown): boolean {
    const normalized = normalizeLoopOver(value);
    if (normalized === undefined || normalized === null) {
        return true;
    }
    if (typeof normalized === 'string') {
        const trimmed = normalized.trim();
        if (!trimmed) return true;
        return !trimmed.includes('{{');
    }
    if (typeof normalized === 'number') {
        return !Number.isFinite(normalized)
            || normalized < 0
            || normalized > MAX_ITERATOR_ITERATIONS;
    }
    if (Array.isArray(normalized)) {
        return normalized.length > MAX_ITERATOR_ITERATIONS;
    }
    if (typeof normalized === 'object' && normalized !== null) {
        return Object.keys(normalized as Record<string, unknown>).length > MAX_ITERATOR_ITERATIONS;
    }
    return true;
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

/** Persist an explicit Done wire state so reload does not re-infer legacy routing. */
export function normalizeIteratorParamsForExport(
    parameters: Record<string, unknown>,
): Record<string, unknown> {
    const next = { ...parameters };
    next.doneNextTaskId = normalizeOptionalTaskRef(next.doneNextTaskId);
    return next;
}

export function readIteratorStudioDoneWire(
    layout: WorkflowDefinition['layout'],
    taskId: string,
): string | undefined {
    const entry = layout?.[taskId];
    if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'studioDoneWire')) {
        return undefined;
    }
    const wire = entry.studioDoneWire;
    return wire == null ? '' : String(wire).trim();
}

/** Restore Done routing from layout metadata before legacy migration runs. */
export function restoreIteratorDoneFromLayout(
    definition: WorkflowDefinition,
): WorkflowDefinition {
    const layout = definition.layout ?? {};
    let changed = false;

    const tasks = definition.tasks.map((task) => {
        if (task.type !== 'ITERATOR_TASK') return task;
        const studioDoneWire = readIteratorStudioDoneWire(layout, task.taskId);
        if (studioDoneWire === undefined) return task;

        const params = { ...(task.parameters as Record<string, unknown>) };
        const current = String(params.doneNextTaskId ?? '').trim();
        if (current === studioDoneWire) return task;

        changed = true;
        return {
            ...task,
            parameters: injectParameterType('ITERATOR_TASK', {
                ...params,
                doneNextTaskId: studioDoneWire,
            }),
        };
    });

    return changed ? { ...definition, tasks } : definition;
}

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

export function validateLoopDonePath(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const raw = parameters.doneNextTaskId;
    if (raw === null || raw === undefined || raw === '') return;
    const taskId = String(raw).trim();
    if (context?.currentTaskId && taskId === context.currentTaskId) {
        errors.doneNextTaskId = 'Cannot route to this task';
    } else if (context && !findWorkflowTask(context, taskId)) {
        errors.doneNextTaskId = 'Task not found in this workflow';
    }
}

