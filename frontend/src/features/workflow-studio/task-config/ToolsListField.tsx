import { Cable } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';

interface ToolRow {
    name: string;
    description: string;
    targetTaskId: string;
    inputSchema: any;
}

function parseTools(value: unknown): ToolRow[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }
    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return { name: `tool_${index + 1}`, description: '', targetTaskId: '', inputSchema: { type: 'object', properties: {} } };
        }
        const row = item as Record<string, unknown>;
        return {
            name: String(row.name ?? ''),
            description: String(row.description ?? ''),
            targetTaskId: String(row.targetTaskId ?? ''),
            inputSchema: row.inputSchema || { type: 'object', properties: {} },
        };
    });
}

interface ToolsListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (tools: ToolRow[]) => void;
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
    const tools = parseTools(value);

    const updateTool = (index: number, patch: Partial<ToolRow>) => {
        const next = tools.map((tool, i) => (i === index ? { ...tool, ...patch } : tool));
        onChange(next);
    };

    const listError = errors[fieldKey];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{label}</label>
            </div>

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

            {tools.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
                    <div className="rounded-full bg-muted p-2">
                        <Cable className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                        Connect nodes to the bottom tool handle on the canvas to add AI tools.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tools.map((tool, index) => {
                        const targetError = errors[`${fieldKey}.${index}.targetTaskId`];

                        return (
                            <div
                                key={index}
                                className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Tool: <span className="text-foreground font-mono ml-1 lowercase">{tool.name}</span>
                                    </span>
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
                                        value={tool.description}
                                        onChange={(e) => updateTool(index, { description: e.target.value })}
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
                </div>
            )}

            {listError && <p className="text-xs text-destructive">{listError}</p>}
        </div>
    );
}
