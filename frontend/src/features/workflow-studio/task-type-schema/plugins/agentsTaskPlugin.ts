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
            key: 'credentialId',
            label: 'Connection',
            type: 'credential',
            description: 'Select an AI provider connection.',
            filterTypes: ['CONNECTOR:openai', 'CONNECTOR:anthropic', 'CONNECTOR:gemini', 'CONNECTOR:azure_openai', 'CONNECTOR:groq', 'CONNECTOR:mistral', 'BEARER_TOKEN', 'API_KEY']
        },
        {
            key: 'providerUrl',
            label: 'Provider URL (Optional)',
            type: 'text',
            description: 'Overrides the base URL provided in the credential. Leave empty for default.',
            placeholder: 'https://api.openai.com/v1/chat/completions',
        },
        {
            key: 'model',
            label: 'Model',
            type: 'text',
            description: 'The LLM model to use (e.g., gpt-4o, claude-3-opus, gemini-1.5-pro).',
            defaultValue: 'gpt-3.5-turbo',
            required: true,
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
            key: 'agentMode',
            label: 'Agent Mode',
            type: 'segmented',
            options: [
                { label: 'ReAct Loop', value: 'REACT' },
                { label: 'Single Call', value: 'SINGLE_CALL' }
            ],
            defaultValue: 'REACT',
            description: 'Choose if the agent should loop to execute tools (ReAct) or just call once.',
        },
        {
            key: 'maxLoops',
            label: 'Max Loops',
            type: 'number',
            defaultValue: 10,
            description: 'Maximum number of iterations in ReAct mode.',
            hideIf: (params) => params.agentMode !== 'REACT'
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
        {
            key: 'tools',
            label: 'Canvas Tools',
            type: 'toolsList',
            description: 'Workflow tasks connected as tools via the canvas tool handle.',
        },
        {
            key: 'mcpTools',
            label: 'MCP Tools',
            type: 'mcpToolsPicker',
            description: 'Select remote tools from an MCP server connection.',
        },
    ],
    validate: (parameters, _, errors) => {
        if (!parameters.model) {
            errors.model = 'Model is required';
        }
        if (!parameters.userPrompt) {
            errors.userPrompt = 'User Prompt is required';
        }

        if (Array.isArray(parameters.tools)) {
            parameters.tools.forEach((row: Record<string, unknown>, index: number) => {
                const isMcp =
                    row.sourceType === 'MCP' ||
                    (typeof row.credentialId === 'string' && row.credentialId.trim().length > 0);
                if (!isMcp) return;

                if (!String(row.credentialId ?? '').trim()) {
                    errors[`tools.${index}.credentialId`] = 'MCP tool requires a connection';
                }
                if (!String(row.remoteToolName ?? '').trim()) {
                    errors[`tools.${index}.remoteToolName`] = 'MCP tool requires a remote tool name';
                }
            });
        }
    },
    normalize: (parameters) => {
        const next = { ...parameters };
        
        if (!next.agentMode) next.agentMode = 'REACT';
        if (next.maxLoops) next.maxLoops = Number(next.maxLoops);

        // Normalize stream to boolean
        if (next.stream === 'true') next.stream = true;
        if (next.stream === 'false') next.stream = false;

        // Normalize tools list
        if (Array.isArray(next.tools)) {
            next.tools = next.tools.map((row: Record<string, unknown>) => {
                const isMcp =
                    row.sourceType === 'MCP' ||
                    (typeof row.credentialId === 'string' && row.credentialId.trim().length > 0);
                const inputSchema =
                    row.inputSchema && Object.keys(row.inputSchema as object).length > 0
                        ? row.inputSchema
                        : { type: 'object', properties: {} };

                if (isMcp) {
                    return {
                        sourceType: 'MCP',
                        credentialId: String(row.credentialId ?? '').trim(),
                        remoteToolName: String(row.remoteToolName ?? '').trim(),
                        name: String(row.name ?? '').trim(),
                        description: String(row.description ?? '').trim(),
                        inputSchema,
                    };
                }

                return {
                    sourceType: 'TASK',
                    name: String(row.name ?? '').trim(),
                    description: String(row.description ?? '').trim(),
                    targetTaskId: normalizeOptionalTaskRef(row.targetTaskId as string | null | undefined),
                    inputSchema,
                };
            });
        }

        return next;
    },
    preview: (parameters) => ({
        primary: typeof parameters.model === 'string' ? parameters.model : 'AI Agent',
        secondary: typeof parameters.userPrompt === 'string' ? parameters.userPrompt.slice(0, 50) : '',
    }),
    executionSummary: ({ executionData }) => {
        const data = executionData as Record<string, unknown> | null | undefined;
        const lines: import('@/features/executions/lib/executionSummaryUtils').ExecutionSummaryLine[] = [
            { label: 'Model', value: (data?.modelUsed as string) ?? '—' },
            {
                label: 'Total Tokens',
                value: data?.totalTokens != null ? String(data.totalTokens) : '—',
            },
        ];
        if (data?.loopExhausted === true) {
            lines.push({
                label: 'Warning',
                value: 'Agent reached max loops before completing',
                tone: 'warning',
            });
        } else if (typeof data?.warning === 'string' && data.warning.trim()) {
            lines.push({
                label: 'Warning',
                value: data.warning,
                tone: 'warning',
            });
        }
        return {
            lines,
            mainOutput: data?.generatedText as string | undefined,
        };
    },
});
