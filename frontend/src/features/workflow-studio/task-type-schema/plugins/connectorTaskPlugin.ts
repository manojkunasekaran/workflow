import { Puzzle } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { TaskTestPanel } from '../../task-config/TaskTestPanel';

export const connectorTaskPlugin = defineTaskPlugin({
    type: 'CONNECTOR_TASK',
    label: 'Integration',
    icon: Puzzle,
    accentColor: '#0ea5e9',
    defaultTaskId: 'connector_task',
    testComponent: TaskTestPanel,
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
        if (!executionData || status === 'SKIPPED') return null;
        const items = [];
        
        const execData = executionData as any;
        if (execData.response?.statusCode) {
            items.push({
                label: 'Status Code',
                value: String(execData.response.statusCode),
                status: execData.response.statusCode >= 400 ? 'error' : 'success',
            });
        }
        
        return items.length > 0 ? { lines: items } : null;
    },
});
