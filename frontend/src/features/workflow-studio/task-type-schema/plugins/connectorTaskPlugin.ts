import { Puzzle } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';

export const connectorTaskPlugin = defineTaskPlugin({
    type: 'CONNECTOR_TASK',
    label: 'Integration',
    icon: Puzzle,
    accentColor: '#0ea5e9',
    defaultTaskId: 'connector_task',
    fields: [], // dynamically loaded in ConnectorTaskConfigPanel
    preview(params: Record<string, unknown>) {
        const name = typeof params.connectorName === 'string' && params.connectorName
            ? params.connectorName
            : typeof params.connectorId === 'string' && params.connectorId
                ? params.connectorId.charAt(0).toUpperCase() + params.connectorId.slice(1)
                : 'Select Integration';
        const actionId = typeof params.actionId === 'string' ? params.actionId : '';
        return {
            primary: name,
            secondary: actionId || undefined,
        };
    },
    executionSummary({ executionData, status }) {
        if (!executionData || status === 'SKIPPED') return [];
        const items = [];
        
        if (executionData.response?.statusCode) {
            items.push({
                label: 'Status Code',
                value: String(executionData.response.statusCode),
                status: executionData.response.statusCode >= 400 ? 'error' : 'success',
            });
        }
        
        return items;
    },
});
