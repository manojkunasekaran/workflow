import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { McpResponseMode, McpTriggerConfig, WorkflowTask } from '@/types/api';

export function createDefaultMcpConfig(): McpTriggerConfig {
    return {
        toolName: '',
        description: '',
        responseMode: 'EXECUTION_ID',
        responseTaskId: '',
        waitTimeoutSeconds: 300,
        active: true,
    };
}

interface McpTriggerTabProps {
    workflowId?: string;
    mcp: McpTriggerConfig;
    tasks: WorkflowTask[];
    onChange: (mcp: McpTriggerConfig) => void;
}

export function McpTriggerTab({ workflowId, mcp, tasks, onChange }: McpTriggerTabProps) {
    const [copied, setCopied] = useState(false);

    const update = (patch: Partial<McpTriggerConfig>) => onChange({ ...mcp, ...patch });

    const endpointHint = workflowId && workflowId !== 'NEW_WORKFLOW'
        ? `/rest/mcp/workflows/${workflowId}`
        : '/rest/mcp/workflows/{workflowId}';

    const handleCopy = async () => {
        await navigator.clipboard.writeText(endpointHint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="mcp-active" className="text-base font-medium">
                    MCP Trigger Active
                </Label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={mcp.active ?? true}
                    onClick={() => update({ active: !(mcp.active ?? true) })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                        (mcp.active ?? true) ? 'bg-primary' : 'bg-input',
                    )}
                >
                    <span
                        className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                            (mcp.active ?? true) ? 'translate-x-4' : 'translate-x-0',
                        )}
                    />
                </button>
            </div>

            <div className="space-y-2">
                <Label>Tool name</Label>
                <Input
                    value={mcp.toolName ?? ''}
                    onChange={(e) => update({ toolName: e.target.value })}
                    placeholder="my_workflow_tool"
                />
                <p className="text-xs text-muted-foreground">
                    Unique name exposed to MCP clients. Input schema comes from workflow inputs.
                </p>
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Input
                    value={mcp.description ?? ''}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Optional tool description"
                />
            </div>

            <div className="space-y-2">
                <Label>Response mode</Label>
                <Select
                    value={mcp.responseMode ?? 'EXECUTION_ID'}
                    onValueChange={(value: McpResponseMode) => update({ responseMode: value })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="EXECUTION_ID">Return execution ID</SelectItem>
                        <SelectItem value="TASK_OUTPUT">Wait and return task output</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(mcp.responseMode ?? 'EXECUTION_ID') === 'TASK_OUTPUT' && (
                <>
                    <div className="space-y-2">
                        <Label>Response task</Label>
                        <Select
                            value={mcp.responseTaskId ?? ''}
                            onValueChange={(value) => update({ responseTaskId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select task..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tasks.map((task) => (
                                    <SelectItem key={task.taskId} value={task.taskId}>
                                        {task.taskId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Wait timeout (seconds)</Label>
                        <Input
                            type="number"
                            min={1}
                            value={mcp.waitTimeoutSeconds ?? 300}
                            onChange={(e) => update({ waitTimeoutSeconds: Number(e.target.value) })}
                        />
                    </div>
                </>
            )}

            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <Label className="text-xs text-muted-foreground">Per-workflow endpoint</Label>
                <div className="flex items-center gap-2">
                    <code className="flex-1 truncate text-xs">{endpointHint}</code>
                    <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
