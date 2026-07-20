import { Repeat } from 'lucide-react';
import {
    ITERATOR_NESTED_TYPES,
    normalizeIteratorActionsForApi,
    normalizeLoopOver,
    parseIteratorActions,
    validateLoopDonePath,
    type IteratorActionRow,
} from '../iteratorTask';
import { defineTaskPlugin, type TaskTypePlugin } from '../pluginTypes';
import { normalizeOptionalTaskRef } from '../taskRefs';
import { validateGenericFields } from '../fieldValidation';
import type { TaskParameterErrors, TaskValidationContext } from '../types';
import { ITERATOR_TASK_WIRING } from './wiring';
import { dataTransformTaskPlugin } from './dataTransformTaskPlugin';
import { httpTaskPlugin } from './httpTaskPlugin';
import { scriptTaskPlugin } from './scriptTaskPlugin';
import { waitTaskPlugin } from './waitTaskPlugin';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

const NESTED_PLUGINS: TaskTypePlugin[] = [
    httpTaskPlugin,
    scriptTaskPlugin,
    waitTaskPlugin,
    dataTransformTaskPlugin,
];
const nestedPluginByType = new Map(NESTED_PLUGINS.map((plugin) => [plugin.type, plugin]));

function validateIteratorActions(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const actions = parseIteratorActions(parameters.actions);
    if (actions.length === 0) {
        errors.actions = 'Add at least one step from the Loop output on the canvas';
        return;
    }

    const taskIds = new Set<string>();
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const taskId = action.taskId.trim();

        if (!taskId) {
            errors[`actions.${i}.taskId`] = 'Loop step is missing — reconnect on the canvas';
        } else if (taskIds.has(taskId)) {
            errors[`actions.${i}.taskId`] = 'Duplicate loop steps detected';
        } else {
            taskIds.add(taskId);
        }

        if (!ITERATOR_NESTED_TYPES.includes(action.type)) {
            errors[`actions.${i}.type`] = 'This task type cannot run inside a loop';
            continue;
        }

        const nestedPlugin = nestedPluginByType.get(action.type);
        if (!nestedPlugin) continue;

        const nestedErrors: TaskParameterErrors = {};
        validateGenericFields(nestedPlugin.fields, action.parameters, nestedErrors, context);
        nestedPlugin.validate?.(action.parameters, context, nestedErrors);

        for (const [key, message] of Object.entries(nestedErrors)) {
            errors[`actions.${i}.parameters.${key}`] = message;
        }
    }
}

export const iteratorTaskPlugin = defineTaskPlugin({
    type: 'ITERATOR_TASK',
    label: 'Loop',
    icon: Repeat,
    accentColor: '#0284c7',
    defaultTaskId: 'loop_task',
    wiring: ITERATOR_TASK_WIRING,
    fields: [
        {
            key: 'loopOver',
            label: 'Loop over',
            type: 'text',
            required: true,
            placeholder: 'e.g. a list from a previous step, or 5',
            description:
                'What to repeat: a list, key/value map, or a number (runs that many times). Use {{ }} only if you need an expression.',
        },
    ],
    validate(parameters, context, errors) {
        const loopOver = parameters.loopOver;
        if (loopOver === undefined || loopOver === null || String(loopOver).trim() === '') {
            errors.loopOver = 'Loop source is required';
        }
        validateIteratorActions(parameters, errors, context);
        validateLoopDonePath(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        next.loopOver = normalizeLoopOver(next.loopOver);
        if (Array.isArray(next.actions)) {
            next.actions = normalizeIteratorActionsForApi(next.actions as IteratorActionRow[]);
        }
        const done = next.doneNextTaskId;
        next.doneNextTaskId = normalizeOptionalTaskRef(done);
        return next;
    },
    preview(params) {
        const loopOver = String(params.loopOver ?? '').trim() || '—';
        const done = String(params.doneNextTaskId ?? '').trim();
        return {
            primary: `Loop over ${loopOver}`,
            secondary: done ? 'Done path connected' : 'Done path not connected',
        };
    },
    executionSummary({ parameters, executionData, status }) {
        const data = recordFromUnknown(executionData);
        const total = data?.totalIterations;
        const completed = data?.completedIterations;
        const failed = data?.failedIterations;
        const current = data?.currentIndex;
        const loopOver = formatPrimitive(data?.loopOver ?? parameters.loopOver);
        const isRunning = status.toUpperCase() === 'RUNNING';
        const progressValue =
            completed != null && total != null && typeof total === 'number' && total > 0
                ? `${String(completed)} / ${String(total)}`
                : isRunning && current != null
                  ? `Index ${String(current)}`
                  : formatPrimitive(completed);
        return {
            lines: [
                { label: 'Loop over', value: loopOver },
                {
                    label: 'Progress',
                    value: progressValue,
                    tone:
                        typeof failed === 'number' && failed > 0
                            ? 'warning'
                            : completed != null && total != null
                              ? 'success'
                              : 'default',
                },
                {
                    label: 'Failed items',
                    value: formatPrimitive(failed ?? 0),
                    tone: typeof failed === 'number' && failed > 0 ? 'danger' : 'default',
                },
                { label: 'Done step', value: formatPrimitive(data?.doneNextTaskId ?? parameters.doneNextTaskId) },
            ],
        };
    },
});
