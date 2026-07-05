import { GitBranch } from 'lucide-react';
import {
    defaultConditionalBranch,
    normalizeConditionalBranchesForApi,
    validateConditionalParameters,
    type ConditionalBranchRow,
} from '../conditionalBranch';
import { defineTaskPlugin } from '../pluginTypes';
import { CONDITIONAL_TASK_WIRING } from './wiring';

export const conditionalTaskPlugin = defineTaskPlugin({
    type: 'CONDITIONAL',
    label: 'Conditional',
    icon: GitBranch,
    accentColor: '#9333ea',
    defaultTaskId: 'conditional_task',
    wiring: CONDITIONAL_TASK_WIRING,
    fields: [
        {
            key: 'branches',
            label: 'Condition branches',
            type: 'conditionalBranchList',
            required: true,
            defaultValue: [defaultConditionalBranch(0)],
            description:
                'Evaluated top to bottom — first match wins. Drag from output handles on the canvas to wire each branch.',
        },
        {
            key: 'defaultNextTaskId',
            label: 'Else output',
            type: 'wiredRef',
            description: 'Drag from the Else handle on this node to wire the fallback path.',
        },
    ],
    validate(parameters, context, errors) {
        validateConditionalParameters(parameters, errors, context);
    },
    normalize(parameters) {
        const next = { ...parameters };
        if (Array.isArray(next.branches)) {
            next.branches = normalizeConditionalBranchesForApi(next.branches as ConditionalBranchRow[]);
        }
        return next;
    },
    preview(params) {
        const branchList = Array.isArray(params.branches) ? params.branches : [];
        const count = branchList.length;
        const fallback = params.defaultNextTaskId
            ? `else → ${params.defaultNextTaskId}`
            : 'no default';
        return {
            primary: count === 1 ? '1 branch' : `${count} branches`,
            secondary: fallback,
        };
    },
});
