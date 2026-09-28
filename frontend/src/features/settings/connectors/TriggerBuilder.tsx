import { useState } from 'react';
import type { ConnectorTrigger } from '@/api/connectorApi';
import type { PollEventSemantics, WebhookConfig } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import InputSchemaBuilder from './InputSchemaBuilder';

const TRIGGER_TYPE_STYLES: Record<string, string> = {
    POLL: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    WEBHOOK: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
};

const SEMANTICS_OPTIONS: Array<{ value: PollEventSemantics; label: string }> = [
    { value: 'NEW_ITEMS', label: 'New items' },
    { value: 'UPDATED', label: 'Updated' },
    { value: 'NEW_OR_UPDATED', label: 'New or updated' },
    { value: 'RESPONSE_CHANGED', label: 'Response changed' },
];

function emptyTrigger(triggerType: 'POLL' | 'WEBHOOK'): ConnectorTrigger {
    if (triggerType === 'POLL') {
        return {
            triggerId: '',
            displayName: '',
            triggerType: 'POLL',
            inputSchema: [],
            preset: {
                poll: {
                    semantics: 'NEW_ITEMS',
                    http: { method: 'GET', url: '' },
                    detection: { keyPaths: ['id'] },
                },
            },
        };
    }

    return {
        triggerId: '',
        displayName: '',
        triggerType: 'WEBHOOK',
        inputSchema: [],
        preset: {
            webhook: {
                deliveryMode: 'SUBSCRIBE',
                subscribeHttp: { method: 'POST', url: '', body: 'url={{callbackUrl}}' },
                unsubscribeHttp: { method: 'DELETE', url: '' },
                subscriptionIdPath: '$.id',
            },
        },
    };
}

interface TriggerBuilderProps {
    triggers: ConnectorTrigger[];
    onChange: (triggers: ConnectorTrigger[]) => void;
}

export default function TriggerBuilder({ triggers, onChange }: TriggerBuilderProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingTrigger, setEditingTrigger] = useState<ConnectorTrigger | null>(null);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

    const openCreate = () => {
        setEditingTrigger(emptyTrigger('POLL'));
        setEditingIndex(-1);
    };

    const changeTriggerType = (triggerType: 'POLL' | 'WEBHOOK') => {
        if (!editingTrigger) return;
        const next = emptyTrigger(triggerType);
        next.displayName = editingTrigger.displayName;
        next.description = editingTrigger.description;
        setEditingTrigger(next);
    };

    const openEdit = (index: number) => {
        setEditingTrigger({ ...triggers[index] });
        setEditingIndex(index);
    };

    const closeEdit = () => {
        setEditingIndex(null);
        setEditingTrigger(null);
    };

    const handleSaveTrigger = () => {
        if (!editingTrigger) return;

        const next = [...(triggers ?? [])];
        if (editingIndex === -1) {
            next.push(editingTrigger);
        } else if (editingIndex !== null) {
            next[editingIndex] = editingTrigger;
        }
        onChange(next);
        closeEdit();
    };

    const removeTrigger = (index: number) => {
        const next = [...triggers];
        next.splice(index, 1);
        onChange(next);
        setConfirmDeleteIndex(null);
    };

    const updatePollPreset = (patch: Record<string, unknown>) => {
        if (!editingTrigger) return;
        setEditingTrigger({
            ...editingTrigger,
            preset: {
                ...editingTrigger.preset,
                poll: { ...editingTrigger.preset?.poll, ...patch },
            },
        });
    };

    const updateWebhookPreset = (patch: Partial<WebhookConfig>) => {
        if (!editingTrigger) return;
        setEditingTrigger({
            ...editingTrigger,
            preset: {
                ...editingTrigger.preset,
                webhook: {
                    deliveryMode: 'SUBSCRIBE',
                    ...editingTrigger.preset?.webhook,
                    ...patch,
                },
            },
        });
    };

    const pollHttp = editingTrigger?.preset?.poll?.http;
    const pollDetection = editingTrigger?.preset?.poll?.detection;
    const webhookPreset = editingTrigger?.preset?.webhook;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-sm font-medium">Triggers ({(triggers?.length || 0)})</h3>
                    <p className="text-xs text-muted-foreground">
                        Presets shown in Studio when users configure poll or app-register triggers.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={openCreate} className="h-8 shrink-0">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add trigger
                </Button>
            </div>

            {(triggers?.length || 0) === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground">No trigger presets yet.</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {triggers.map((trigger, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary/30 transition-colors group cursor-pointer min-w-0"
                            onClick={() => openEdit(index)}
                        >
                            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 ${
                                        TRIGGER_TYPE_STYLES[trigger.triggerType] || TRIGGER_TYPE_STYLES.POLL
                                    }`}
                                >
                                    {trigger.triggerType === 'WEBHOOK' ? 'REGISTER' : trigger.triggerType}
                                </span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">
                                        {trigger.displayName || 'Unnamed trigger'}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {trigger.triggerType === 'POLL'
                                            ? trigger.preset?.poll?.http?.url || 'No poll URL'
                                            : trigger.preset?.webhook?.subscribeHttp?.url || 'No subscribe URL'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                                {confirmDeleteIndex === index ? (
                                    <>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); removeTrigger(index); }}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIndex(null); }}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); openEdit(index); }}
                                        >
                                            <Settings2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIndex(index); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle>
                            {editingIndex === -1 ? 'Create trigger preset' : 'Edit trigger preset'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTrigger?.triggerType === 'POLL'
                                ? 'Users pick this in Studio under Check for changes.'
                                : 'Users pick this in Studio under Webhook → App registers for me.'}
                        </DialogDescription>
                    </DialogHeader>

                    {editingTrigger && (
                        <div className="px-6 py-4 overflow-y-auto space-y-6 flex-1 min-w-0">
                            {editingIndex === -1 && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Trigger type</Label>
                                    <Select
                                        value={editingTrigger.triggerType}
                                        onValueChange={(val) => changeTriggerType(val as 'POLL' | 'WEBHOOK')}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POLL">Poll — check for changes on a schedule</SelectItem>
                                            <SelectItem value="WEBHOOK">App-register — we register with the vendor API</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Trigger name <span className="text-destructive">*</span></Label>
                                    <Input
                                        className="h-9"
                                        value={editingTrigger.displayName}
                                        onChange={(e) => setEditingTrigger({ ...editingTrigger, displayName: e.target.value })}
                                        placeholder="e.g. New records"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        className="h-9"
                                        value={editingTrigger.description ?? ''}
                                        onChange={(e) => setEditingTrigger({ ...editingTrigger, description: e.target.value })}
                                        placeholder="Shown in the event picker"
                                    />
                                </div>
                            </div>

                            {editingTrigger.triggerType === 'POLL' && (
                                <>
                                    <div className="flex gap-3 min-w-0">
                                        <div className="space-y-1.5 w-28 shrink-0">
                                            <Label className="text-xs">Method</Label>
                                            <Select
                                                value={pollHttp?.method ?? 'GET'}
                                                onValueChange={(val) => updatePollPreset({
                                                    http: { ...pollHttp, method: val },
                                                })}
                                            >
                                                <SelectTrigger className="h-9 font-mono">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['GET', 'POST'].map((m) => (
                                                        <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <Label className="text-xs">
                                                Poll URL — use {'{fieldKey}'} for input placeholders
                                            </Label>
                                            <Input
                                                className="h-9 font-mono"
                                                value={pollHttp?.url ?? ''}
                                                onChange={(e) => updatePollPreset({
                                                    http: { ...pollHttp, url: e.target.value },
                                                })}
                                                placeholder="https://api.example.com/items?owner={owner}"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Semantics</Label>
                                            <Select
                                                value={editingTrigger.preset?.poll?.semantics ?? 'NEW_ITEMS'}
                                                onValueChange={(val) => updatePollPreset({ semantics: val })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SEMANTICS_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Item id paths (comma-separated)</Label>
                                            <Input
                                                className="h-9 font-mono"
                                                value={(pollDetection?.keyPaths ?? ['id']).join(', ')}
                                                onChange={(e) => updatePollPreset({
                                                    detection: {
                                                        ...pollDetection,
                                                        keyPaths: e.target.value
                                                            .split(',')
                                                            .map((s) => s.trim())
                                                            .filter(Boolean),
                                                    },
                                                })}
                                                placeholder="id"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {editingTrigger.triggerType === 'WEBHOOK' && (
                                <>
                                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                        Use <code className="font-mono">{'{{callbackUrl}}'}</code> in subscribe body.
                                        Use <code className="font-mono">{'{{subscriptionId}}'}</code> in unsubscribe URL.
                                    </div>

                                    <div className="flex gap-3 min-w-0">
                                        <div className="space-y-1.5 w-28 shrink-0">
                                            <Label className="text-xs">Subscribe method</Label>
                                            <Select
                                                value={webhookPreset?.subscribeHttp?.method ?? 'POST'}
                                                onValueChange={(val) => updateWebhookPreset({
                                                    subscribeHttp: {
                                                        ...webhookPreset?.subscribeHttp,
                                                        method: val,
                                                    },
                                                })}
                                            >
                                                <SelectTrigger className="h-9 font-mono">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['POST', 'PUT', 'PATCH'].map((m) => (
                                                        <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <Label className="text-xs">Subscribe URL</Label>
                                            <Input
                                                className="h-9 font-mono"
                                                value={webhookPreset?.subscribeHttp?.url ?? ''}
                                                onChange={(e) => updateWebhookPreset({
                                                    subscribeHttp: {
                                                        ...webhookPreset?.subscribeHttp,
                                                        url: e.target.value,
                                                    },
                                                })}
                                                placeholder="https://api.example.com/webhooks"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Subscribe body</Label>
                                        <Textarea
                                            className="font-mono text-sm min-h-[80px]"
                                            value={webhookPreset?.subscribeHttp?.body ?? ''}
                                            onChange={(e) => updateWebhookPreset({
                                                subscribeHttp: {
                                                    ...webhookPreset?.subscribeHttp,
                                                    body: e.target.value,
                                                },
                                            })}
                                            placeholder='url={{callbackUrl}}'
                                        />
                                    </div>

                                    <div className="flex gap-3 min-w-0">
                                        <div className="space-y-1.5 w-28 shrink-0">
                                            <Label className="text-xs">Unsubscribe method</Label>
                                            <Select
                                                value={webhookPreset?.unsubscribeHttp?.method ?? 'DELETE'}
                                                onValueChange={(val) => updateWebhookPreset({
                                                    unsubscribeHttp: {
                                                        ...webhookPreset?.unsubscribeHttp,
                                                        method: val,
                                                    },
                                                })}
                                            >
                                                <SelectTrigger className="h-9 font-mono">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['DELETE', 'POST'].map((m) => (
                                                        <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <Label className="text-xs">Unsubscribe URL</Label>
                                            <Input
                                                className="h-9 font-mono"
                                                value={webhookPreset?.unsubscribeHttp?.url ?? ''}
                                                onChange={(e) => updateWebhookPreset({
                                                    unsubscribeHttp: {
                                                        ...webhookPreset?.unsubscribeHttp,
                                                        url: e.target.value,
                                                    },
                                                })}
                                                placeholder="https://api.example.com/webhooks/{{subscriptionId}}"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Subscription id path (JSONPath)</Label>
                                        <Input
                                            className="h-9 font-mono"
                                            value={webhookPreset?.subscriptionIdPath ?? ''}
                                            onChange={(e) => updateWebhookPreset({ subscriptionIdPath: e.target.value })}
                                            placeholder="$.id"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-2 border-t">
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium">User inputs</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Fields the workflow author fills in when picking this preset (e.g. repo, channel).
                                    </p>
                                </div>
                                <InputSchemaBuilder
                                    fields={editingTrigger.inputSchema ?? []}
                                    onChange={(fields) => setEditingTrigger({ ...editingTrigger, inputSchema: fields })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="px-6 py-4 border-t shrink-0">
                        <Button variant="outline" onClick={closeEdit}>Cancel</Button>
                        <Button onClick={handleSaveTrigger} disabled={!editingTrigger?.displayName?.trim()}>
                            Save trigger
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
