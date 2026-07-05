import { Timer } from 'lucide-react';
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
            label: 'Duration (ms)',
            type: 'text',
            required: true,
            mono: true,
            defaultValue: '1000',
            placeholder: '1000 or {{$variables.delay}}',
            description: 'Milliseconds, or an expression the backend can resolve.',
        },
    ],
    preview(params) {
        return { primary: `${params.duration ?? '?'} ms` };
    },
});
