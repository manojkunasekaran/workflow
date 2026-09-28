import { Merge } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { normalizeOptionalTaskRef } from '../taskRefs';
import { JOIN_FAILURE_STRATEGIES } from './shared';
import type { JoinMergeMode, JoinWaitPolicy, TaskParameterErrors, TaskValidationContext } from '../types';
import { JOIN_TASK_WIRING } from './wiring';
import { formatDurationMs, formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

const FAILURE_STRATEGY_SET = new Set<string>(JOIN_FAILURE_STRATEGIES.map((s) => s.value));
const WAIT_POLICY_SET = new Set<JoinWaitPolicy>(['ALL', 'ANY', 'QUORUM']);
const MERGE_MODE_SET = new Set<JoinMergeMode>(['PASS_THROUGH', 'COLLECT_OUTPUTS']);

function validateJoinParameters(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
): void {
    if ('branchTaskId' in parameters) {
        errors.branchTaskId = 'branchTaskId is no longer supported; use inboundTaskIds';
    }

    const strategy = parameters.failureStrategy;
    if (
        strategy !== undefined &&
        strategy !== null &&
        strategy !== '' &&
        !FAILURE_STRATEGY_SET.has(String(strategy))
    ) {
        errors.failureStrategy = 'Invalid failure strategy';
    }

    const waitPolicy = String(parameters.waitPolicy ?? 'ALL') as JoinWaitPolicy;
    if (!WAIT_POLICY_SET.has(waitPolicy)) {
        errors.waitPolicy = 'Invalid wait policy';
    }

    const mergeMode = String(parameters.mergeMode ?? 'PASS_THROUGH') as JoinMergeMode;
    if (!MERGE_MODE_SET.has(mergeMode)) {
        errors.mergeMode = 'Invalid merge mode';
    }

    const inboundTaskIds = Array.isArray(parameters.inboundTaskIds) ? parameters.inboundTaskIds : [];
    const seen = new Set<string>();
    for (let i = 0; i < inboundTaskIds.length; i += 1) {
        const inboundId = String(inboundTaskIds[i] ?? '').trim();
        if (!inboundId) {
            errors[`inboundTaskIds.${i}`] = 'Inbound task ID is required';
            continue;
        }
        if (seen.has(inboundId)) {
            errors[`inboundTaskIds.${i}`] = 'Duplicate inbound task ID';
        }
        seen.add(inboundId);
    }

    if (waitPolicy === 'QUORUM') {
        const quorum = Number(parameters.quorumCount);
        if (!Number.isInteger(quorum) || quorum < 1 || quorum > inboundTaskIds.length) {
            errors.quorumCount = 'quorumCount must be between 1 and the number of inbounds';
        }
    }
}

export const joinTaskPlugin = defineTaskPlugin({
    type: 'JOIN',
    label: 'Join branches',
    icon: Merge,
    accentColor: '#059669',
    defaultTaskId: 'join_task',
    wiring: JOIN_TASK_WIRING,
    fields: [
        {
            key: 'waitPolicy',
            label: 'Wait policy',
            type: 'select',
            defaultValue: 'ALL',
            options: [
                { label: 'All inbounds', value: 'ALL' },
                { label: 'Any inbound', value: 'ANY' },
                { label: 'Quorum', value: 'QUORUM' },
            ],
        },
        {
            key: 'quorumCount',
            label: 'Quorum count',
            type: 'number',
            min: 1,
            hideIf: (parameters) => parameters.waitPolicy !== 'QUORUM',
        },
        {
            key: 'failureStrategy',
            label: 'When branches fail',
            type: 'select',
            defaultValue: 'FAIL_FAST',
            options: [...JOIN_FAILURE_STRATEGIES],
            description:
                'Drag from each branch’s last task (Next / main-out) into the Branches input on this node.',
        },
        {
            key: 'mergeMode',
            label: 'Merge mode',
            type: 'select',
            defaultValue: 'PASS_THROUGH',
            options: [
                { label: 'Pass through', value: 'PASS_THROUGH' },
                { label: 'Collect outputs', value: 'COLLECT_OUTPUTS' },
            ],
        },
        {
            key: '_connectedInbounds',
            label: 'Connected inbounds',
            type: 'inboundList',
            description: 'Tasks wired into this JOIN via the Branches input on the canvas.',
        },
    ],
    validate(parameters, _context, errors) {
        validateJoinParameters(parameters, errors);
    },
    normalize(parameters) {
        const next = { ...parameters };
        delete next.branchTaskId;
        next.nextTaskId = normalizeOptionalTaskRef(next.nextTaskId);
        next.waitPolicy = String(next.waitPolicy ?? 'ALL');
        next.mergeMode = String(next.mergeMode ?? 'PASS_THROUGH');
        if (Array.isArray(next.inboundTaskIds)) {
            next.inboundTaskIds = next.inboundTaskIds
                .map((id) => normalizeOptionalTaskRef(id))
                .filter((id): id is string => Boolean(id));
        } else {
            next.inboundTaskIds = [];
        }
        if (next.waitPolicy !== 'QUORUM') {
            delete next.quorumCount;
        }
        return next;
    },
    preview(params) {
        const inboundCount = Array.isArray(params.inboundTaskIds) ? params.inboundTaskIds.length : 0;
        const strategy = String(params.failureStrategy ?? 'FAIL_FAST').replace(/_/g, ' ').toLowerCase();
        return {
            primary: inboundCount === 1 ? '1 inbound' : `${inboundCount} inbounds`,
            secondary: strategy,
        };
    },
    executionSummary({ parameters, executionData }) {
        const data = recordFromUnknown(executionData);
        const total = data?.totalInbounds ?? data?.totalBranches;
        const success = data?.successfulInbounds ?? data?.successfulBranches;
        const failed = data?.failedInbounds ?? data?.failedBranches;
        const strategy = String(parameters.failureStrategy ?? 'FAIL_FAST').replace(/_/g, ' ').toLowerCase();
        return {
            lines: [
                {
                    label: 'Inbounds',
                    value:
                        success != null && total != null
                            ? `${String(success)} / ${String(total)} succeeded`
                            : formatPrimitive(total),
                    tone:
                        typeof failed === 'number' && failed > 0
                            ? 'danger'
                            : success != null
                              ? 'success'
                              : 'default',
                },
                {
                    label: 'Failed',
                    value: formatPrimitive(failed),
                    tone: typeof failed === 'number' && failed > 0 ? 'danger' : 'default',
                },
                { label: 'Wait time', value: formatDurationMs(data?.joinDurationMs) },
                { label: 'On failure', value: strategy },
            ],
        };
    },
});
