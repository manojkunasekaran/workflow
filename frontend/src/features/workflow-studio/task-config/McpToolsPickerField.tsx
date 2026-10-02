import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { connectionApi } from '@/api/connectionApi';
import type { AgentTool, McpToolDescriptor } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConnectionSelectField } from '@/features/workflow-studio/task-config/ConnectionSelectField';
import {
    buildMcpToolFromDescriptor,
    credentialNameSlug,
    isMcpTool,
    mcpToolKey,
    parseAgentTools,
    resolveLlmToolName,
} from '@/features/workflow-studio/task-config/agentToolUtils';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { cn } from '@/lib/utils';

interface McpToolsPickerFieldProps {
    label: string;
    description?: string;
    value: unknown;
    onChange: (tools: AgentTool[]) => void;
    errors?: TaskParameterErrors;
}

export function McpToolsPickerField({
    label,
    description,
    value,
    onChange,
    errors = {},
}: McpToolsPickerFieldProps) {
    const allTools = parseAgentTools(value);
    const taskTools = allTools.filter((tool) => !isMcpTool(tool));
    const mcpTools = allTools.filter(isMcpTool);

    const [pickerCredentialId, setPickerCredentialId] = useState('');
    const [credentialName, setCredentialName] = useState('');
    const [remoteTools, setRemoteTools] = useState<McpToolDescriptor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [credentialNames, setCredentialNames] = useState<Record<string, string>>({});

    const selectedKeys = useMemo(
        () => new Set(mcpTools.map((tool) => mcpToolKey(tool.credentialId ?? '', tool.remoteToolName ?? ''))),
        [mcpTools],
    );

    const loadCredentialNames = useCallback(async () => {
        try {
            const credentials = await connectionApi.getAll();
            const names: Record<string, string> = {};
            for (const cred of credentials) {
                if (cred.id) {
                    names[cred.id] = cred.name;
                }
            }
            setCredentialNames(names);
        } catch {
            // Non-blocking — LLM preview falls back to slug default
        }
    }, []);

    useEffect(() => {
        void loadCredentialNames();
    }, [loadCredentialNames]);

    const loadRemoteTools = useCallback(async (credentialId: string) => {
        if (!credentialId) {
            setRemoteTools([]);
            setLoadError(null);
            return;
        }
        setIsLoading(true);
        setLoadError(null);
        try {
            const cred = await connectionApi.getById(credentialId);
            setCredentialName(cred.name);
            setCredentialNames((prev) => ({ ...prev, [credentialId]: cred.name }));
            const tools = await connectionApi.listMcpTools(credentialId);
            setRemoteTools(tools);
        } catch (error) {
            setRemoteTools([]);
            setLoadError(error instanceof Error ? error.message : 'Failed to load MCP tools');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (pickerCredentialId) {
            void loadRemoteTools(pickerCredentialId);
        } else {
            setRemoteTools([]);
            setLoadError(null);
        }
    }, [pickerCredentialId, loadRemoteTools]);

    const commitTools = (nextMcpTools: AgentTool[]) => {
        onChange([...taskTools, ...nextMcpTools]);
    };

    const toggleRemoteTool = (descriptor: McpToolDescriptor, checked: boolean) => {
        if (!pickerCredentialId) return;
        const key = mcpToolKey(pickerCredentialId, descriptor.name);
        if (checked) {
            if (selectedKeys.has(key)) return;
            const entry = buildMcpToolFromDescriptor(pickerCredentialId, credentialName, descriptor);
            commitTools([...mcpTools, entry]);
            return;
        }
        commitTools(mcpTools.filter((tool) => mcpToolKey(tool.credentialId ?? '', tool.remoteToolName ?? '') !== key));
    };

    const removeMcpTool = (index: number) => {
        commitTools(mcpTools.filter((_, i) => i !== index));
    };

    const updateMcpToolDescription = (index: number, description: string) => {
        const next = mcpTools.map((tool, i) => (i === index ? { ...tool, description } : tool));
        commitTools(next);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-foreground">{label}</label>
                {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
            </div>

            <ConnectionSelectField
                value={pickerCredentialId}
                onChange={setPickerCredentialId}
                filterType="MCP_SERVER"
                label="MCP Connection"
                description="Select an MCP server to browse available tools."
            />

            {pickerCredentialId && (
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading tools from server…
                        </div>
                    )}

                    {loadError && (
                        <div className="flex items-start justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                            <div className="flex items-start gap-2 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{loadError}</span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs shrink-0"
                                onClick={() => void loadRemoteTools(pickerCredentialId)}
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                            </Button>
                        </div>
                    )}

                    {!isLoading && !loadError && remoteTools.length === 0 && (
                        <p className="text-xs text-muted-foreground">No tools reported by this MCP server.</p>
                    )}

                    {!isLoading && remoteTools.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                Available tools
                            </p>
                            {remoteTools.map((descriptor) => {
                                const key = mcpToolKey(pickerCredentialId, descriptor.name);
                                const checked = selectedKeys.has(key);
                                const llmName = `${credentialNameSlug(credentialName)}__${descriptor.name}`;
                                return (
                                    <label
                                        key={descriptor.name}
                                        className={cn(
                                            'flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors',
                                            checked
                                                ? 'border-purple-500/40 bg-purple-50/50'
                                                : 'border-border bg-background hover:bg-muted/30',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                                            checked={checked}
                                            onChange={(e) => toggleRemoteTool(descriptor, e.target.checked)}
                                        />
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-medium font-mono">{descriptor.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    LLM: {llmName}
                                                </span>
                                            </div>
                                            {descriptor.description && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                    {descriptor.description}
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {mcpTools.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Selected MCP tools ({mcpTools.length})
                    </p>
                    {mcpTools.map((tool, index) => {
                        const credName = credentialNames[tool.credentialId ?? ''] ?? '';
                        const llmName = resolveLlmToolName(tool, credName);
                        const credError = errors[`tools.${allTools.indexOf(tool)}.credentialId`];
                        const remoteError = errors[`tools.${allTools.indexOf(tool)}.remoteToolName`];

                        return (
                            <div
                                key={mcpToolKey(tool.credentialId ?? '', tool.remoteToolName ?? '')}
                                className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <StatusBadge variant="info" size="sm">MCP</StatusBadge>
                                            <span className="text-xs font-mono truncate">{tool.remoteToolName}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Connection: <span className="text-foreground">{credName || tool.credentialId}</span>
                                        </p>
                                        <p className="text-[11px] text-muted-foreground font-mono">
                                            LLM name: <span className="text-foreground">{llmName}</span>
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeMcpTool(index)}
                                        aria-label="Remove MCP tool"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-foreground">
                                        What does this tool do?
                                    </label>
                                    <Input
                                        value={tool.description ?? ''}
                                        onChange={(e) => updateMcpToolDescription(index, e.target.value)}
                                        placeholder="Explain the tool's purpose to the AI..."
                                        className="text-sm bg-background"
                                    />
                                </div>

                                {(credError || remoteError) && (
                                    <p className="text-xs text-destructive">{credError ?? remoteError}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {mcpTools.length === 0 && !pickerCredentialId && (
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 p-5 text-center space-y-2">
                    <div className="rounded-full bg-muted p-2">
                        <Plug className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[220px]">
                        Pick an MCP connection above to add remote tools for the agent.
                    </p>
                </div>
            )}
        </div>
    );
}
