import { UserCheck } from 'lucide-react';
import {
    defaultHumanActions,
    normalizeHumanActionsForApi,
    validateHumanTaskParameters,
} from '../humanTask';
import { defineTaskPlugin } from '../pluginTypes';
import { normalizeOptionalTaskRef } from '../taskRefs';
import type { HumanActionRow } from '../humanTask';
import { HUMAN_TASK_WIRING } from './wiring';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

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
        next.approvedNextTaskId = normalizeOptionalTaskRef(next.approvedNextTaskId);
        next.rejectedNextTaskId = normalizeOptionalTaskRef(next.rejectedNextTaskId);
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
    executionSummary({ parameters, executionData, status }) {
        const data = recordFromUnknown(executionData);
        const outcome = formatPrimitive(data?.currentOutcome);
        const actionTaken = formatPrimitive(data?.actionTaken);
        return {
            lines: [
                { label: 'Title', value: formatPrimitive(data?.title ?? parameters.title) },
                { label: 'Assignee', value: formatPrimitive(data?.assignee ?? parameters.assignee) },
                {
                    label: 'Outcome',
                    value: outcome,
                    tone:
                        outcome === 'APPROVED'
                            ? 'success'
                            : outcome === 'REJECTED'
                              ? 'danger'
                              : status === 'PAUSED'
                                ? 'warning'
                                : 'default',
                },
                { label: 'Action', value: actionTaken },
                { label: 'Responded by', value: formatPrimitive(data?.respondedBy) },
            ],
        };
    },
});
