import { useEffect, useState } from 'react';
import { Cable } from 'lucide-react';
import { connectionApi } from '@/api/connectionApi';
import type { AgentTool } from '@/types/api';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    isMcpTool,
    isTaskTool,
    parseAgentTools,
    resolveLlmToolName,
} from '@/features/workflow-studio/task-config/agentToolUtils';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';

interface ToolsListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (tools: AgentTool[]) => void;
    errors?: TaskParameterErrors;
}

export function ToolsListField({
    fieldKey,
    label,
    description,
    value,
    onChange,
    errors = {},
}: ToolsListFieldProps) {
    const allTools = parseAgentTools(value);
    const taskTools = allTools.filter(isTaskTool);
    const mcpTools = allTools.filter(isMcpTool);
    const includesMcpInValue = mcpTools.length > 0;
    const [credentialNames, setCredentialNames] = useState<Record<string, string>>({});

    const emitTools = (nextTaskTools: AgentTool[], nextMcpTools: AgentTool[] = mcpTools) => {
        if (includesMcpInValue) {
            onChange([...nextTaskTools, ...nextMcpTools]);
            return;
        }
        onChange(nextTaskTools);
    };

    useEffect(() => {
        const mcpCredentialIds = mcpTools
            .map((tool) => tool.credentialId)
            .filter((id): id is string => Boolean(id));
        if (mcpCredentialIds.length === 0) return;

        void connectionApi.getAll().then((credentials) => {
            const names: Record<string, string> = {};
            for (const cred of credentials) {
                if (cred.id) {
                    names[cred.id] = cred.name;
                }
            }
            setCredentialNames(names);
        }).catch(() => {
            // Non-blocking
        });
    }, [mcpTools]);

    const updateTaskTool = (index: number, patch: Partial<AgentTool>) => {
        const nextTaskTools = taskTools.map((tool, i) => (i === index ? { ...tool, ...patch } : tool));
        emitTools(nextTaskTools);
    };

    const updateMcpTool = (index: number, patch: Partial<AgentTool>) => {
        const nextMcpTools = mcpTools.map((tool, i) => (i === index ? { ...tool, ...patch } : tool));
        emitTools(taskTools, nextMcpTools);
    };

    const listError = errors[fieldKey];

    if (taskTools.length === 0 && mcpTools.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-foreground">{label}</label>
                </div>
                {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
                    <div className="rounded-full bg-muted p-2">
                        <Cable className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                        Connect nodes to the bottom tool handle on the canvas to add AI tools.
                    </p>
                </div>
                {listError && <p className="text-xs text-destructive">{listError}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{label}</label>
            </div>

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

            <div className="space-y-3">
                {taskTools.map((tool, index) => {
                    const targetError = errors[`${fieldKey}.${index}.targetTaskId`];

                    return (
                        <div
                            key={`task-${tool.targetTaskId || index}`}
                            className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge variant="neutral" size="sm">Task</StatusBadge>
                                    <span className="text-xs font-semibold font-mono lowercase text-foreground">
                                        {tool.name}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    className="text-[11px] font-medium text-foreground"
                                    htmlFor={`${fieldKey}-${index}-desc`}
                                >
                                    What does this tool do?
                                </label>
                                <Input
                                    id={`${fieldKey}-${index}-desc`}
                                    value={tool.description ?? ''}
                                    onChange={(e) => updateTaskTool(index, { description: e.target.value })}
                                    placeholder="Explain the tool's purpose to the AI..."
                                    className="text-sm bg-background"
                                />
                            </div>

                            {targetError && (
                                <p className="text-xs text-destructive">{targetError}</p>
                            )}
                        </div>
                    );
                })}

                {mcpTools.map((tool, index) => {
                    const credName = credentialNames[tool.credentialId ?? ''] ?? '';
                    const llmName = resolveLlmToolName(tool, credName);

                    return (
                        <div
                            key={`mcp-${tool.credentialId}-${tool.remoteToolName}`}
                            className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5"
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge variant="info" size="sm">MCP</StatusBadge>
                                <span className="text-xs font-mono text-foreground">{tool.remoteToolName}</span>
                            </div>

                            <div className="space-y-1 text-[11px] text-muted-foreground">
                                <p>
                                    Connection: <span className="text-foreground">{credName || tool.credentialId}</span>
                                </p>
                                <p className="font-mono">
                                    LLM name: <span className="text-foreground">{llmName}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    className="text-[11px] font-medium text-foreground"
                                    htmlFor={`${fieldKey}-mcp-${index}-desc`}
                                >
                                    What does this tool do?
                                </label>
                                <Input
                                    id={`${fieldKey}-mcp-${index}-desc`}
                                    value={tool.description ?? ''}
                                    onChange={(e) => updateMcpTool(index, { description: e.target.value })}
                                    placeholder="Explain the tool's purpose to the AI..."
                                    className="text-sm bg-background"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {listError && <p className="text-xs text-destructive">{listError}</p>}
        </div>
    );
}
