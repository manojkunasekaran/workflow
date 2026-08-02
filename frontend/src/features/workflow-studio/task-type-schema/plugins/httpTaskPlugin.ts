import { Globe } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { HTTP_METHODS } from './shared';
import {
    formatDurationMs,
    formatPrimitive,
    readNested,
    recordFromUnknown,
    type ExecutionSummaryLine,
} from '@/features/executions/lib/executionSummaryUtils';

export const httpTaskPlugin = defineTaskPlugin({
    type: 'HTTP_TASK',
    label: 'HTTP Request',
    icon: Globe,
    accentColor: '#7c3aed',
    defaultTaskId: 'http_task',
    fields: [
        {
            key: 'credentialId',
            label: 'Authentication',
            type: 'credential',
            filterTypes: ['BEARER_TOKEN', 'BASIC_AUTH'],
            description: 'Select a saved credential to authenticate this request automatically.',
        },
        {
            key: 'method',
            label: 'Method',
            type: 'segmented',
            defaultValue: 'GET',
            options: HTTP_METHODS,
        },
        {
            key: 'url',
            label: 'URL',
            type: 'text',
            required: true,
            mono: true,
            defaultValue: 'https://api.example.com',
            placeholder: 'https://api.example.com/resource',
        },
        {
            key: 'headers',
            label: 'Headers',
            type: 'keyValue',
            defaultValue: {},
        },
        {
            key: 'body',
            label: 'Body',
            type: 'textarea',
            mono: true,
            rows: 6,
            placeholder: '{"key": "value"} or plain text',
        },
    ],
    normalize(parameters) {
        const next = { ...parameters };
        if (typeof next.body === 'string' && next.body.trim()) {
            const trimmed = next.body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                next.body = JSON.parse(trimmed);
            }
        }
        return next;
    },
    validate(parameters, _context, errors) {
        if (typeof parameters.body === 'string' && parameters.body.trim()) {
            const trimmed = parameters.body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    JSON.parse(trimmed);
                } catch {
                    errors.body = 'Invalid JSON body';
                }
            }
        }
    },
    preview(params) {
        const method = String(params.method ?? 'GET');
        const url = String(params.url ?? '');
        const host = url.replace(/^https?:\/\//, '').split('/')[0] || 'configure url';
        const isWebhook = url.includes('slack') || url.includes('webhook');
        return {
            method,
            primary: isWebhook ? 'Slack Webhook' : host,
            secondary: isWebhook ? 'notifications' : undefined,
        };
    },
    executionSummary({ parameters, executionData, status }) {
        const data = recordFromUnknown(executionData);
        const request = recordFromUnknown(readNested(data, 'request'));
        const response = recordFromUnknown(readNested(data, 'response'));
        const method = formatPrimitive(request?.method ?? parameters.method);
        const url = formatPrimitive(request?.url ?? parameters.url);
        const statusCode = response?.statusCode;
        const statusText = response?.statusText;
        const durationMs = response?.durationMs ?? data?.durationMs;
        const lines: ExecutionSummaryLine[] = [
            { label: 'Request', value: `${method} ${url}` },
            {
                label: 'Response',
                value:
                    statusCode != null
                        ? `${statusCode}${statusText ? ` ${statusText}` : ''}`
                        : status.toUpperCase() === 'FAILED'
                          ? 'Request failed'
                          : '—',
                tone:
                    typeof statusCode === 'number'
                        ? statusCode >= 400
                            ? 'danger'
                            : 'success'
                        : 'default',
            },
            { label: 'Duration', value: formatDurationMs(durationMs) },
        ];
        return { lines };
    },
});
