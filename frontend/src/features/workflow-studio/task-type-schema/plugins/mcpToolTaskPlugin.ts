import { Plug } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const mcpToolTaskPlugin = defineTaskPlugin({
    type: 'MCP_TOOL',
    label: 'MCP Tool',
    icon: Plug,
    accentColor: '#0d9488',
    defaultTaskId: 'mcp_tool',
    fields: [
        {
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            filterTypes: ['MCP_SERVER'],
            description: 'MCP server connection to invoke.',
            required: true,
        },
        {
            key: 'remoteToolName',
            label: 'Remote Tool',
            type: 'mcpRemoteToolName',
            description: 'Tool name on the remote MCP server.',
            required: true,
        },
        {
            key: 'arguments',
            label: 'Arguments (JSON)',
            type: 'json',
            description: 'JSON object passed to the MCP tool.',
            defaultValue: {},
        },
        {
            key: 'timeoutSeconds',
            label: 'Timeout (seconds)',
            type: 'number',
            defaultValue: 30,
            min: 1,
            description: 'Maximum time to wait for the tool response.',
        },
    ],
    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            errors.credentialId = 'Connection is required';
        }
        if (!String(parameters.remoteToolName ?? '').trim()) {
            errors.remoteToolName = 'Remote tool name is required';
        }
        if (parameters.arguments != null && typeof parameters.arguments === 'string' && parameters.arguments.trim()) {
            try {
                JSON.parse(parameters.arguments);
            } catch {
                errors.arguments = 'Invalid JSON';
            }
        }
    },
    normalize(parameters) {
        const next = { ...parameters };
        if (next.timeoutSeconds != null) {
            next.timeoutSeconds = Number(next.timeoutSeconds);
        }
        if (typeof next.arguments === 'string' && next.arguments.trim()) {
            next.arguments = JSON.parse(next.arguments);
        }
        if (next.arguments == null || next.arguments === '') {
            next.arguments = {};
        }
        return next;
    },
    preview(parameters) {
        const tool = String(parameters.remoteToolName ?? '').trim();
        return {
            primary: tool || 'MCP Tool',
            secondary: 'Remote call',
        };
    },
    executionSummary({ executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [
            { label: 'Tool', value: formatPrimitive(data?.remoteToolName ?? data?.toolName) },
            {
                label: 'Result',
                value: formatPrimitive(data?.result ?? data?.content),
            },
        ];
        if (errorMessage) {
            lines.push({ label: 'Error', value: String(errorMessage), tone: 'danger' });
        }
        return { lines };
    },
});
