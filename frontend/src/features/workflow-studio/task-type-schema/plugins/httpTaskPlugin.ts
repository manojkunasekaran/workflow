import { Globe } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { HTTP_METHODS } from './shared';

export const httpTaskPlugin = defineTaskPlugin({
    type: 'HTTP_TASK',
    label: 'HTTP Request',
    icon: Globe,
    accentColor: '#7c3aed',
    defaultTaskId: 'http_task',
    fields: [
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
        {
            key: 'credentialId',
            label: 'Credential ID',
            type: 'text',
            mono: true,
            placeholder: 'Optional — stored credential reference',
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
});
