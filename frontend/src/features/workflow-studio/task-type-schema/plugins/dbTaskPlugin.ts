import { Database } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const dbTaskPlugin = defineTaskPlugin({
    type: 'DB_TASK',
    label: 'SQL Database',
    icon: Database,
    accentColor: '#047857', // bg-emerald-700
    defaultTaskId: 'sql_task',
    fields: [
        {
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            filterTypes: ['CONNECTOR:postgresql', 'CONNECTOR:mysql', 'CONNECTOR:mssql', 'CONNECTOR:oracle', 'CONNECTOR:mariadb', 'CONNECTOR:sqlite'],
            description: 'Select a saved database connection credential.',
            required: true,
        },
        {
            key: 'operation',
            label: 'Operation',
            type: 'segmented',
            options: [
                { label: 'SELECT', value: 'SELECT' },
                { label: 'INSERT', value: 'INSERT' },
                { label: 'UPDATE', value: 'UPDATE' },
                { label: 'DELETE', value: 'DELETE' },
                { label: 'RAW', value: 'RAW' },
            ],
            defaultValue: 'SELECT',
            required: true,
        },
        {
            key: 'table',
            label: 'Table',
            type: 'text',
            placeholder: 'users',
            description: 'The table to perform the operation on.',
            hideIf: (p) => p.operation === 'RAW',
        },
        {
            key: 'returnMode',
            label: 'Return',
            type: 'segmented',
            options: [
                { label: 'All Rows', value: 'ALL_ROWS' },
                { label: 'First Row Only', value: 'FIRST_ROW' },
            ],
            defaultValue: 'ALL_ROWS',
            hideIf: (p) => p.operation !== 'SELECT',
        },
        {
            key: 'limit',
            label: 'Row Limit',
            type: 'number',
            defaultValue: 100,
            hideIf: (p) => p.operation !== 'SELECT',
        },
        {
            key: 'values',
            label: 'Values',
            type: 'keyValue',
            description: 'Column → value pairs to insert or update. Values support {{ expressions }}.',
            hideIf: (p) => p.operation !== 'INSERT' && p.operation !== 'UPDATE',
        },
        {
            key: 'conditions',
            label: 'WHERE Clause',
            type: 'text',
            mono: true,
            placeholder: 'id = ? AND status = ?',
            description: 'Positional ? placeholders filled by Condition Parameters below.',
            hideIf: (p) => p.operation === 'INSERT' || p.operation === 'RAW',
        },
        {
            key: 'conditionParameters',
            label: 'Condition Parameters',
            type: 'keyValue',
            description: 'Values for each ? in the WHERE clause, in order. Keys are labels only.',
            hideIf: (p) => p.operation === 'INSERT' || p.operation === 'RAW',
        },
        {
            key: 'query',
            label: 'SQL Query',
            type: 'textarea',
            mono: true,
            rows: 6,
            placeholder: 'SELECT * FROM users WHERE id = ?',
            hideIf: (p) => p.operation !== 'RAW',
        },
        {
            key: 'parameters',
            label: 'Query Parameters',
            type: 'keyValue',
            description: 'Positional bind parameters for ? placeholders in your query. Keys are labels only.',
            hideIf: (p) => p.operation !== 'RAW',
        },
        {
            key: 'queryTimeout',
            label: 'Query Timeout (s)',
            type: 'number',
            defaultValue: 30,
        },
    ],

    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            errors.credentialId = 'Connection credential is required';
        }
        if (parameters.operation !== 'RAW') {
            if (!parameters.table || String(parameters.table).trim() === '') {
                errors.table = 'Table name is required';
            }
        } else {
            if (!parameters.query || String(parameters.query).trim() === '') {
                errors.query = 'SQL Query is required for RAW operation';
            }
        }
    },

    preview(params) {
        const table = String(params.table ?? '');
        const op = String(params.operation ?? 'SELECT');

        const primaryLabel = op === 'RAW' ? 'Raw Query' : (table || 'Configure DB Task');
        const secondaryLabel = op;

        return {
            primary: primaryLabel,
            secondary: secondaryLabel,
        };
    },

    executionSummary({ parameters, executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const status = formatPrimitive(data?.status);
        const isSuccess = status === 'SUCCESS';

        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [
            {
                label: 'Status',
                value: status || (errorMessage ? 'FAILED' : '--'),
                tone: (isSuccess ? 'success' : errorMessage || status === 'FAILED' ? 'danger' : 'default') as 'success' | 'danger' | 'default',
            },
            {
                label: 'Operation',
                value: formatPrimitive(data?.operation ?? parameters.operation),
            },
        ];

        if (data?.rowsAffected != null) {
            lines.push({
                label: 'Rows Affected',
                value: formatPrimitive(data.rowsAffected),
            });
        } else if (Array.isArray(data?.rows)) {
            lines.push({
                label: 'Rows Returned',
                value: String(data.rows.length),
            });
        }

        if (data?.durationMs != null) {
            lines.push({
                label: 'Duration',
                value: `${data.durationMs}ms`,
            });
        }

        if (data?.errorMessage || errorMessage) {
            lines.push({
                label: 'Error',
                value: formatPrimitive(data?.errorMessage ?? errorMessage),
                tone: 'danger',
            });
        }

        return { lines };
    },
});
