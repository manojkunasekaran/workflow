import { Database } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const mongoTaskPlugin = defineTaskPlugin({
    type: 'MONGO_TASK',
    label: 'MongoDB Database',
    icon: Database,
    accentColor: '#16a34a', // green-600
    defaultTaskId: 'mongo_task',
    fields: [
        {
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            filterTypes: ['CONNECTOR:mongodb'],
            description: 'Select a saved MongoDB connection credential.',
            required: true,
        },
        {
            key: 'operation',
            label: 'Operation',
            type: 'segmented',
            options: [
                { label: 'FIND', value: 'FIND' },
                { label: 'INSERT', value: 'INSERT' },
                { label: 'UPDATE', value: 'UPDATE' },
                { label: 'DELETE', value: 'DELETE' },
            ],
            defaultValue: 'FIND',
            required: true,
        },
        {
            key: 'collection',
            label: 'Collection',
            type: 'text',
            placeholder: 'users',
            description: 'The MongoDB collection.',
            required: true,
        },
        {
            key: 'filter',
            label: 'Filter (JSON)',
            type: 'textarea',
            mono: true,
            placeholder: '{"status": "active"}',
            hideIf: (p) => p.operation === 'INSERT',
        },
        {
            key: 'document',
            label: 'Document (JSON)',
            type: 'textarea',
            mono: true,
            placeholder: '{"name": "Alice"}',
            hideIf: (p) => p.operation === 'FIND' || p.operation === 'DELETE',
        },
    ],

    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            errors.credentialId = 'Connection credential is required';
        }
        if (!parameters.collection || String(parameters.collection).trim() === '') {
            errors.collection = 'Collection name is required';
        }
    },

    preview(params) {
        const coll = String(params.collection ?? '');
        const op = String(params.operation ?? 'FIND');

        return {
            primary: coll || 'Configure Mongo Task',
            secondary: op,
        };
    },

    executionSummary({ executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [];
        if (data?.result) {
             lines.push({ label: 'Result', value: typeof data.result === 'object' ? JSON.stringify(data.result) : String(data.result) });
        }
        if (errorMessage) {
             lines.push({ label: 'Error', value: String(errorMessage), tone: 'danger' });
        }
        return { lines };
    },
});
