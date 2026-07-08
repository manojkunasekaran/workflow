import { Timer } from 'lucide-react';
import { formatWaitPreview } from '@/features/workflow-studio/task-config/waitDuration';
import { defineTaskPlugin } from '../pluginTypes';

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
            defaultValue: 1_000,
        },
    ],
    validate(parameters, _context, errors) {
        const duration = parameters.duration;
        const ms = typeof duration === 'number' ? duration : Number(duration);
        if (!Number.isFinite(ms) || ms < 1_000) {
            errors.duration = 'Enter a duration of at least 1 second';
        }
    },
    preview(params) {
        return { primary: formatWaitPreview(params.duration) };
    },
});
