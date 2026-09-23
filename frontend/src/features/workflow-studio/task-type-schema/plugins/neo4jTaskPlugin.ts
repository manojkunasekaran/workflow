import { Database } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const neo4jTaskPlugin = defineTaskPlugin({
    type: 'NEO4J_TASK',
    label: 'Neo4j Database',
    icon: Database,
    accentColor: '#2563eb', // blue-600
    defaultTaskId: 'neo4j_task',
    fields: [
        {
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            filterTypes: ['CONNECTOR:neo4j'],
            description: 'Select a saved Neo4j connection credential.',
            required: true,
        },
        {
            key: 'cypher',
            label: 'Cypher Query',
            type: 'textarea',
            mono: true,
            rows: 6,
            placeholder: 'MATCH (n:Person) RETURN n LIMIT 10',
            required: true,
        },
        {
            key: 'parameters',
            label: 'Query Parameters',
            type: 'keyValue',
            description: 'Bind parameters for the Cypher query.',
        },
    ],

    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            errors.credentialId = 'Connection credential is required';
        }
        if (!parameters.cypher || String(parameters.cypher).trim() === '') {
            errors.cypher = 'Cypher query is required';
        }
    },

    preview(_params) {
        return {
            primary: 'Cypher Query',
            secondary: 'NEO4J',
        };
    },

    executionSummary({ executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [];
        if (data?.result) {
             lines.push({ label: 'Records Returned', value: String(Array.isArray(data.result) ? data.result.length : 'Yes') });
        }
        if (errorMessage) {
             lines.push({ label: 'Error', value: String(errorMessage), tone: 'danger' });
        }
        return { lines };
    },
});
