import { Bot } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { normalizeOptionalTaskRef } from '../taskRefs';

export const agentsTaskPlugin = defineTaskPlugin({
    type: 'AGENTS_TASK',
    label: 'AI Agent',
    icon: Bot,
    accentColor: 'bg-purple-600',
    defaultTaskId: 'agent_1',
    wiring: {
        outputs: [],
        mainFlowIn: true,
        mainFlowOut: true,
        toolInput: true,
    },
    fields: [
        {
            key: 'providerUrl',
            label: 'Provider URL (Optional)',
            type: 'text',
            description: 'Defaults to https://api.openai.com/v1/chat/completions',
            placeholder: 'https://api.openai.com/v1/chat/completions',
        },
        {
            key: 'model',
            label: 'Model',
            type: 'text',
            description: 'The LLM model to use (e.g., gpt-4o, llama3).',
            defaultValue: 'gpt-3.5-turbo',
            required: true,
        },
        {
            key: 'credentialId',
            label: 'Credential / API Key',
            type: 'credential',
            description: 'Select an integration credential containing the API key.',
            filterTypes: ['OPENAI']
        },
        {
            key: 'systemPrompt',
            label: 'System Prompt',
            type: 'textarea',
            description: 'The system instructions for the AI.',
            placeholder: 'You are a helpful assistant...',
        },
        {
            key: 'userPrompt',
            label: 'User Prompt',
            type: 'textarea',
            description: 'The input prompt for the AI.',
            placeholder: 'Translate {{$input.text}} to French',
            required: true,
        },
        {
            key: 'temperature',
            label: 'Temperature',
            type: 'number',
            description: 'Controls randomness (0.0 to 2.0).',
            defaultValue: 0.7,
        },
        {
            key: 'maxTokens',
            label: 'Max Tokens',
            type: 'number',
            description: 'Limit the number of tokens generated.',
        },
        {
            key: 'stream',
            label: 'Enable Streaming',
            type: 'segmented',
            options: [
                { label: 'Yes', value: 'true' },
                { label: 'No', value: 'false' }
            ],
            defaultValue: 'false',
            description: 'Stream tokens in real-time to the UI.',
        },
    ],
    validate: (parameters, _, errors) => {
        if (!parameters.model) {
            errors.model = 'Model is required';
        }
        if (!parameters.userPrompt) {
            errors.userPrompt = 'User Prompt is required';
        }
    },
    normalize: (parameters) => {
        const next = { ...parameters };
        
        // Normalize stream to boolean
        if (next.stream === 'true') next.stream = true;
        if (next.stream === 'false') next.stream = false;

        // Normalize tools list
        if (Array.isArray(next.tools)) {
            next.tools = next.tools.map((row: any) => ({
                name: String(row.name ?? '').trim(),
                description: String(row.description ?? '').trim(),
                targetTaskId: normalizeOptionalTaskRef(row.targetTaskId),
                // if they didn't provide schema, default it to empty object so it's a valid JSON schema
                inputSchema: row.inputSchema && Object.keys(row.inputSchema).length > 0 
                    ? row.inputSchema 
                    : { type: "object", properties: {} },
            }));
        }

        return next;
    },
    preview: (parameters) => ({
        primary: typeof parameters.model === 'string' ? parameters.model : 'AI Agent',
        secondary: typeof parameters.userPrompt === 'string' ? parameters.userPrompt.slice(0, 50) : '',
    }),
    executionSummary: ({ executionData }) => {
        const data = executionData as any;
        return {
            lines: [
                { label: 'Model', value: data?.modelUsed ?? '—' },
                { label: 'Total Tokens', value: data?.totalTokens != null ? String(data.totalTokens) : '—' },
            ],
            mainOutput: data?.generatedText,
        };
    },
});
