import { Code2 } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const scriptTaskPlugin = defineTaskPlugin({
    type: 'SCRIPT_TASK',
    label: 'Script',
    icon: Code2,
    accentColor: '#ea580c',
    defaultTaskId: 'script_task',
    fields: [
        {
            key: 'script',
            label: 'Script',
            type: 'textarea',
            required: true,
            mono: true,
            rows: 12,
            defaultValue: '// your code here',
        },
        {
            key: 'language',
            label: 'Language',
            type: 'select',
            defaultValue: 'javascript',
            options: [{ label: 'JavaScript', value: 'javascript' }],
        },
    ],
    preview(params) {
        const script = String(params.script ?? '');
        const line = script.split('\n').find((l) => l.trim()) ?? 'script';
        return { primary: line.length > 28 ? `${line.slice(0, 28)}...` : line };
    },
    executionSummary({ parameters, executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const logs = formatPrimitive(data?.logs);
        return {
            lines: [
                { label: 'Language', value: formatPrimitive(data?.language ?? parameters.language) },
                { label: 'Result', value: formatPrimitive(data?.result) },
                {
                    label: 'Error',
                    value: formatPrimitive(data?.error ?? errorMessage),
                    tone: data?.error || errorMessage ? 'danger' : 'default',
                },
                { label: 'Logs', value: logs },
            ],
        };
    },
});
