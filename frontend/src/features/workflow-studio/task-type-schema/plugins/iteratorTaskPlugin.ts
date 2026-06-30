import { Repeat } from 'lucide-react';
import {
    defaultIteratorAction,
    ITERATOR_NESTED_TYPES,
    normalizeIteratorActionsForApi,
    normalizeLoopOver,
    parseIteratorActions,
    type IteratorActionRow,
} from '../iteratorTask';
import { defineTaskPlugin, type TaskTypePlugin } from '../pluginTypes';
import { validateGenericFields } from '../fieldValidation';
import type { TaskParameterErrors, TaskValidationContext } from '../types';
import { dataTransformTaskPlugin } from './dataTransformTaskPlugin';
import { httpTaskPlugin } from './httpTaskPlugin';
import { scriptTaskPlugin } from './scriptTaskPlugin';
import { waitTaskPlugin } from './waitTaskPlugin';

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
        errors.actions = 'At least one sub-task is required';
        return;
    }

    const taskIds = new Set<string>();
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const taskId = action.taskId.trim();

        if (!taskId) {
            errors[`actions.${i}.taskId`] = 'Sub-task ID is required';
        } else if (taskIds.has(taskId)) {
            errors[`actions.${i}.taskId`] = 'Sub-task IDs must be unique';
        } else {
            taskIds.add(taskId);
        }

        if (!ITERATOR_NESTED_TYPES.includes(action.type)) {
            errors[`actions.${i}.type`] = 'Unsupported sub-task type';
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
    label: 'Iterator',
    icon: Repeat,
    defaultTaskId: 'iterator_task',
    fields: [
        {
            key: 'loopOver',
            label: 'Loop over',
            type: 'text',
            required: true,
            mono: true,
            placeholder: '{{$input.items}} or ["a","b"] or 5',
            description:
                'Expression, JSON array/object, or number (iterates 0..n-1). Resolved at runtime.',
        },
        {
            key: 'actions',
            label: 'Sub-tasks per iteration',
            type: 'iteratorActionList',
            required: true,
            defaultValue: [defaultIteratorAction(0)],
            description: 'Executed in order for each loop item.',
        },
    ],
    validate(parameters, context, errors) {
        const loopOver = parameters.loopOver;
        if (loopOver === undefined || loopOver === null || String(loopOver).trim() === '') {
            errors.loopOver = 'Loop source is required';
        }
        validateIteratorActions(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        next.loopOver = normalizeLoopOver(next.loopOver);
        if (Array.isArray(next.actions)) {
            next.actions = normalizeIteratorActionsForApi(next.actions as IteratorActionRow[]);
        }
        return next;
    },
    preview(params) {
        const actionCount = Array.isArray(params.actions) ? params.actions.length : 0;
        const loop = params.loopOver != null ? String(params.loopOver) : 'configure loop';
        const loopPreview = loop.length > 24 ? `${loop.slice(0, 24)}…` : loop;
        return {
            primary: loopPreview,
            secondary: actionCount === 1 ? '1 sub-task' : `${actionCount} sub-tasks`,
        };
    },
});
