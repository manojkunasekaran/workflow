import { UserCheck } from 'lucide-react';
import {
    defaultHumanActions,
    normalizeHumanActionsForApi,
    validateHumanTaskParameters,
} from '../humanTask';
import { defineTaskPlugin } from '../pluginTypes';
import type { HumanActionRow } from '../humanTask';
import { HUMAN_TASK_WIRING } from './wiring';

export const humanTaskPlugin = defineTaskPlugin({
    type: 'HUMAN_TASK',
    label: 'Human Approval',
    icon: UserCheck,
    accentColor: '#db2777',
    defaultTaskId: 'human_task',
    wiring: HUMAN_TASK_WIRING,
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
            key: 'actions',
            label: 'Actions',
            type: 'humanActionList',
            required: true,
            defaultValue: defaultHumanActions(),
            description: 'Buttons the reviewer can click (e.g. Approve, Reject).',
        },
        {
            key: 'formSchema',
            label: 'Extra fields for reviewer (optional)',
            type: 'json',
            defaultValue: null,
            description:
                'Ask the reviewer to fill in more than Approve/Reject — e.g. a comment, reason, or dropdown. Leave empty if buttons alone are enough. Advanced users: JSON schema defining those fields.',
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
        const approved = String(params.approvedNextTaskId ?? '').trim();
        const rejected = String(params.rejectedNextTaskId ?? '').trim();
        const routing = [
            approved ? 'Approved path connected' : 'Approved path not connected',
            rejected ? 'Rejected path connected' : 'Rejection fails workflow',
        ].join(' · ');
        return {
            primary: title,
            secondary: routing,
        };
    },
});
