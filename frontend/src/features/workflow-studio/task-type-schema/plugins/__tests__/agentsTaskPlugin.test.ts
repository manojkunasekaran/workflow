// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { agentsTaskPlugin } from '../agentsTaskPlugin';

describe('agentsTaskPlugin', () => {
    describe('validate', () => {
        it('requires model and userPrompt', () => {
            const errors: Record<string, string> = {};
            agentsTaskPlugin.validate!({}, undefined, errors);
            expect(errors.model).toBeTruthy();
            expect(errors.userPrompt).toBeTruthy();
        });

        it('flags MCP tools missing connection or remote name', () => {
            const errors: Record<string, string> = {};
            agentsTaskPlugin.validate!(
                {
                    model: 'gpt-4o',
                    userPrompt: 'Hello',
                    tools: [{ sourceType: 'MCP', credentialId: '', remoteToolName: '' }],
                },
                undefined,
                errors,
            );
            expect(errors['tools.0.credentialId']).toBeTruthy();
            expect(errors['tools.0.remoteToolName']).toBeTruthy();
        });
    });

    describe('normalize', () => {
        it('coerces stream strings and splits task vs MCP tools', () => {
            const normalized = agentsTaskPlugin.normalize!({
                agentMode: 'REACT',
                maxLoops: '5',
                stream: 'true',
                tools: [
                    {
                        sourceType: 'TASK',
                        name: 'fetch',
                        targetTaskId: 'http_1',
                        description: 'Fetch data',
                    },
                    {
                        sourceType: 'MCP',
                        credentialId: 'cred-1',
                        remoteToolName: 'search',
                        description: 'Search docs',
                    },
                ],
            });

            expect(normalized.stream).toBe(true);
            expect(normalized.maxLoops).toBe(5);
            expect(normalized.tools).toHaveLength(2);
            expect(normalized.tools[0]).toMatchObject({
                sourceType: 'TASK',
                name: 'fetch',
                targetTaskId: 'http_1',
            });
            expect(normalized.tools[1]).toMatchObject({
                sourceType: 'MCP',
                credentialId: 'cred-1',
                remoteToolName: 'search',
            });
        });
    });

    describe('executionSummary', () => {
        it('surfaces loop exhaustion warning', () => {
            const summary = agentsTaskPlugin.executionSummary!({
                executionData: {
                    modelUsed: 'gpt-4o',
                    totalTokens: 42,
                    loopExhausted: true,
                    generatedText: 'partial',
                },
            });
            expect(summary.lines.some((line) => line.label === 'Warning')).toBe(true);
            expect(summary.mainOutput).toBe('partial');
        });
    });
});
