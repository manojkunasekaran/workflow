import type { TaskFieldSchema } from '@/features/workflow-studio/task-type-schema/types';
import { HTTP_METHODS } from './shared';

/** Shared HTTP request field schema used by HTTP tasks and poll triggers. */
export const HTTP_REQUEST_FIELDS: TaskFieldSchema[] = [
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
];
