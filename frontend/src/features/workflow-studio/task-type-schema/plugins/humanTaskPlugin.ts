import { UserCheck } from 'lucide-react';
import {
    defaultHumanActions,
    normalizeHumanActionsForApi,
    validateHumanTaskParameters,
} from '../humanTask';
import { defineTaskPlugin } from '../pluginTypes';
import type { HumanActionRow } from '../humanTask';

export const humanTaskPlugin = defineTaskPlugin({
    type: 'HUMAN_TASK',
    label: 'Human Approval',
    icon: UserCheck,
    defaultTaskId: 'human_task',
    fields: [
        {
            key: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            defaultValue: 'Approval required',
        },
        {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            rows: 3,
            defaultValue: '',
        },
        {
            key: 'assignee',
            label: 'Assignee',
            type: 'text',
            placeholder: 'user@example.com',
            defaultValue: '',
        },
        {
            key: 'approvedNextTaskId',
            label: 'Approved next task',
            type: 'taskRef',
            excludeSelf: true,
            description: 'Defaults to next task in chain if empty.',
        },
        {
            key: 'rejectedNextTaskId',
            label: 'Rejected next task',
            type: 'taskRef',
            excludeSelf: true,
            description: 'Fails workflow if empty when rejected.',
        },
        {
            key: 'actions',
            label: 'Actions',
            type: 'humanActionList',
            required: true,
            defaultValue: defaultHumanActions(),
        },
        {
            key: 'formSchema',
            label: 'Form schema',
            type: 'json',
            defaultValue: null,
            description: 'Optional JSON schema for collecting structured input (future).',
        },
    ],
    validate(parameters, context, errors) {
        validateHumanTaskParameters(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        if (Array.isArray(next.actions)) {
            next.actions = normalizeHumanActionsForApi(next.actions as HumanActionRow[]);
        }
        return next;
    },
    preview(params) {
        const title = String(params.title ?? 'Human task');
        const actionCount = Array.isArray(params.actions) ? params.actions.length : 0;
        return {
            primary: title,
            secondary: actionCount === 1 ? '1 action' : `${actionCount} actions`,
        };
    },
});
