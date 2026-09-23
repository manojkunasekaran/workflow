import { Database } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const redisTaskPlugin = defineTaskPlugin({
    type: 'REDIS_TASK',
    label: 'Redis Database',
    icon: Database,
    accentColor: '#dc2626', // red-600
    defaultTaskId: 'redis_task',
    fields: [
        {
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            filterTypes: ['CONNECTOR:redis'],
            description: 'Select a saved Redis connection credential.',
            required: true,
        },
        {
            key: 'command',
            label: 'Command',
            type: 'segmented',
            options: [
                { label: 'GET', value: 'GET' },
                { label: 'SET', value: 'SET' },
                { label: 'DEL', value: 'DEL' },
            ],
            defaultValue: 'GET',
            required: true,
        },
        {
            key: 'key',
            label: 'Key',
            type: 'text',
            placeholder: 'user:123',
            description: 'The Redis key.',
            required: true,
        },
        {
            key: 'value',
            label: 'Value',
            type: 'text',
            hideIf: (p) => p.command !== 'SET',
        },
        {
            key: 'ttl',
            label: 'TTL (seconds)',
            type: 'number',
            hideIf: (p) => p.command !== 'SET',
        },
    ],

    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            errors.credentialId = 'Connection credential is required';
        }
        if (!parameters.key || String(parameters.key).trim() === '') {
            errors.key = 'Key is required';
        }
    },

    preview(params) {
        const key = String(params.key ?? '');
        const cmd = String(params.command ?? 'GET');

        return {
            primary: key || 'Configure Redis Task',
            secondary: cmd,
        };
    },

    executionSummary({ executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [];
        if (data?.result) {
             lines.push({ label: 'Result', value: String(data.result) });
        }
        if (errorMessage) {
             lines.push({ label: 'Error', value: String(errorMessage), tone: 'danger' });
        }
        return { lines };
    },
});
