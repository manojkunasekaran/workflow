import type { WorkflowDefinition } from '@/types/api';
import type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';
import { httpTaskPlugin } from '@/features/workflow-studio/task-type-schema/plugins/httpTaskPlugin';
import { buildDefaultParameters, injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskParameterErrors, TaskValidationContext } from './types';

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

/** Persist an explicit Done wire state so reload does not re-infer legacy routing. */
export function normalizeIteratorParamsForExport(
    parameters: Record<string, unknown>,
): Record<string, unknown> {
    const next = { ...parameters };
    const done = next.doneNextTaskId;
    next.doneNextTaskId =
        done == null || String(done).trim() === '' ? '' : String(done).trim();
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

function hasExplicitDoneRouting(
    params: Record<string, unknown>,
    layout: WorkflowDefinition['layout'],
    taskId: string,
): boolean {
    if (readIteratorStudioDoneWire(layout, taskId) !== undefined) {
        return true;
    }
    return Object.prototype.hasOwnProperty.call(params, 'doneNextTaskId');
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

/** Legacy linear workflows: infer Done wire from the next top-level task in the saved list. */
export function migrateIteratorTasksForCanvas(definition: WorkflowDefinition): WorkflowDefinition {
    const loopBodyIds = new Set<string>();
    for (const task of definition.tasks) {
        if (task.type !== 'ITERATOR_TASK') continue;
        for (const action of parseIteratorActions(task.parameters?.actions)) {
            loopBodyIds.add(action.taskId);
        }
    }

    const layout = definition.layout ?? {};
    let changed = false;
    const tasks = definition.tasks.map((task, index, all) => {
        if (task.type !== 'ITERATOR_TASK') return task;
        const params = { ...(task.parameters as Record<string, unknown>) };
        if (hasExplicitDoneRouting(params, layout, task.taskId)) {
            return task;
        }

        for (let i = index + 1; i < all.length; i++) {
            const next = all[i];
            if (loopBodyIds.has(next.taskId)) continue;
            changed = true;
            return {
                ...task,
                parameters: injectParameterType('ITERATOR_TASK', {
                    ...params,
                    doneNextTaskId: next.taskId,
                }),
            };
        }
        return task;
    });

    return changed ? { ...definition, tasks } : definition;
}
