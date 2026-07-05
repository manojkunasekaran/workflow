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
            key: 'approvedNextTaskId',
            label: 'Approved path',
            type: 'wiredRef',
            description: 'Wire from the Approved handle on the canvas.',
        },
        {
            key: 'rejectedNextTaskId',
            label: 'Rejected path',
            type: 'wiredRef',
            description:
                'Wire from the Rejected handle on the canvas. If empty, rejection fails the workflow.',
        },
        {
            key: 'actions',
            label: 'Actions',
            type: 'humanActionList',
            required: true,
            defaultValue: defaultHumanActions(),
            description: 'Buttons shown to the assignee. Routing uses the Approved/Rejected canvas wires.',
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
        const approved = String(params.approvedNextTaskId ?? '').trim();
        const rejected = String(params.rejectedNextTaskId ?? '').trim();
        const routing = [
            approved ? `approved → ${approved}` : 'approved unwired',
            rejected ? `rejected → ${rejected}` : 'reject fails',
        ].join(' · ');
        return {
            primary: title,
            secondary: routing,
        };
    },
});
