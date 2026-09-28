import { Timer } from 'lucide-react';
import {
    DEFAULT_WAIT_DURATION_MS,
    formatWaitPreview,
    MIN_WAIT_DURATION_MS,
} from '@/features/workflow-studio/task-config/waitDuration';
import { defineTaskPlugin } from '../pluginTypes';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const waitTaskPlugin = defineTaskPlugin({
    type: 'WAIT',
    label: 'Wait',
    icon: Timer,
    accentColor: '#2563eb',
    defaultTaskId: 'wait_task',
    fields: [
        {
            key: 'duration',
            label: 'Duration',
            type: 'waitDuration',
            required: true,
            defaultValue: DEFAULT_WAIT_DURATION_MS,
        },
    ],
    validate(parameters, _context, errors) {
        const duration = parameters.duration;
        const ms = typeof duration === 'number' ? duration : Number(duration);
        if (!Number.isFinite(ms) || ms < MIN_WAIT_DURATION_MS) {
            errors.duration = 'Enter a duration of at least 1 second';
        }
    },
    preview(params) {
        return { primary: formatWaitPreview(params.duration) };
    },
    executionSummary({ parameters, executionData }) {
        const data = recordFromUnknown(executionData);
        const durationMs = data?.duration ?? parameters.duration;
        return {
            lines: [
                { label: 'Configured', value: formatWaitPreview(durationMs) },
                { label: 'Started', value: formatPrimitive(data?.waitStartTime) },
                { label: 'Ended', value: formatPrimitive(data?.waitEndTime) },
            ],
        };
    },
});
