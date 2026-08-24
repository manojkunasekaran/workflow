import { useState } from 'react';
import { type ConnectorAction } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronRight, ChevronDown, Zap, Info } from 'lucide-react';
import InputSchemaBuilder from './InputSchemaBuilder';

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

const METHOD_STYLES: Record<string, string> = {
    GET:    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    POST:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    PUT:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    PATCH:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
    DELETE: 'bg-destructive/10 text-destructive border border-destructive/20',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ActionBuilderProps {
    actions: ConnectorAction[];
    onChange: (actions: ConnectorAction[]) => void;
}

export default function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

    const addAction = () => {
        const newAction: ConnectorAction = {
            actionId: `action_${actions.length + 1}`,
            displayName: '',
            method: 'GET',
            path: '/',
            inputSchema: [],
        };
        onChange([...actions, newAction]);
        setExpandedIndex(actions.length);
    };

    const updateAction = (index: number, updates: Partial<ConnectorAction>) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        onChange(newActions);
    };

    const handleDisplayNameChange = (index: number, displayName: string) => {
        // Auto-derive a stable machine ID from the human-readable display name
        const actionId = slugify(displayName) || `action_${index + 1}`;
        updateAction(index, { displayName, actionId });
    };

    const handlePathChange = (index: number, path: string) => {
        const matches = path.match(/\{([a-zA-Z0-9_]+)\}/g);
        const pathParams = matches ? matches.map(m => m.replace(/[{}]/g, '')) : undefined;
        updateAction(index, { path, pathParams });
    };

    const removeAction = (index: number) => {
        onChange(actions.filter((_, i) => i !== index));
        if (expandedIndex === index) setExpandedIndex(null);
        setConfirmDeleteIndex(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-medium">Actions</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Each action maps to a specific API endpoint users can call from their workflows.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={addAction} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Action
                </Button>
            </div>

            {actions.length === 0 ? (
                <div className="p-10 border-2 border-dashed rounded-xl text-center text-muted-foreground bg-muted/10">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No actions defined</p>
                    <p className="text-xs mt-1">Add an action to define what this connector can do.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {actions.map((action, index) => {
                        const isExpanded = expandedIndex === index;
                        const isConfirmingDelete = confirmDeleteIndex === index;
                        const methodStyle = METHOD_STYLES[action.method] ?? 'bg-muted text-muted-foreground';

                        return (
                            <div key={index} className="border rounded-xl bg-card overflow-hidden shadow-sm">
                                {/* Action header — always visible */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isExpanded
                                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        }
                                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${methodStyle}`}>
                                            {action.method}
                                        </span>
                                        <span className="font-medium text-sm truncate">
                                            {action.displayName || <span className="text-muted-foreground italic">Untitled Action</span>}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono truncate hidden md:block">
                                            {action.path}
                                        </span>
                                    </div>

                                    {/* Action delete — two-step confirm */}
                                    <div
                                        className="flex items-center gap-1 shrink-0"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {isConfirmingDelete ? (
                                            <>
                                                <span className="text-xs text-destructive mr-1">Remove action?</span>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => removeAction(index)}
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setConfirmDeleteIndex(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setConfirmDeleteIndex(index)}
                                                title="Remove action"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded body */}
                                {isExpanded && (
                                    <div className="border-t bg-muted/10 p-4 space-y-5">
                                        {/* Name + derived ID */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Action Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    className="h-9"
                                                    value={action.displayName}
                                                    onChange={e => handleDisplayNameChange(index, e.target.value)}
                                                    placeholder="e.g. Send Message"
                                                />
                                                {action.actionId && (
                                                    <p className="text-[10px] text-muted-foreground font-mono">
                                                        id: <span className="text-foreground">{action.actionId}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                                                <Input
                                                    className="h-9"
                                                    value={action.description ?? ''}
                                                    onChange={e => updateAction(index, { description: e.target.value })}
                                                    placeholder="Briefly describe what this action does"
                                                />
                                            </div>
                                        </div>

                                        {/* Method + Path */}
                                        <div className="flex gap-3">
                                            <div className="space-y-1.5 w-28 shrink-0">
                                                <Label className="text-xs">Method</Label>
                                                <Select
                                                    value={action.method}
                                                    onValueChange={val => updateAction(index, { method: val })}
                                                >
                                                    <SelectTrigger className="h-9 font-mono">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                                            <SelectItem key={m} value={m} className="font-mono">
                                                                {m}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5 flex-1">
                                                <Label className="text-xs">
                                                    API Path
                                                    <span className="text-muted-foreground font-normal ml-1">— use {'{'} {'}'} for dynamic segments</span>
                                                </Label>
                                                <Input
                                                    className="h-9 font-mono"
                                                    value={action.path}
                                                    onChange={e => handlePathChange(index, e.target.value)}
                                                    placeholder="/channels/{channelId}/messages"
                                                />
                                            </div>
                                        </div>

                                        {/* Path param detection hint */}
                                        {action.pathParams && action.pathParams.length > 0 && (
                                            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary">
                                                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                <span>
                                                    Detected path variables:{' '}
                                                    {action.pathParams.map(p => (
                                                        <code key={p} className="px-1 py-0.5 rounded bg-primary/10 font-mono mx-0.5">{p}</code>
                                                    ))}
                                                    {' '}— add these as Input Fields below so users can provide values.
                                                </span>
                                            </div>
                                        )}

                                        {/* Input schema */}
                                        <div className="pt-1">
                                            <InputSchemaBuilder
                                                fields={action.inputSchema}
                                                onChange={fields => updateAction(index, { inputSchema: fields })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
