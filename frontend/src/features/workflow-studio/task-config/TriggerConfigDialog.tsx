import { useState, useEffect } from 'react';
import { Play, Webhook, Clock, Copy, Check, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { STUDIO_GHOST_ICON_BUTTON_CLASS } from '@/features/workflow-studio/constants/studioUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CRON_PRESETS } from '@/features/workflow-studio/lib/cronPresets';
import type { TriggerConfig, TriggerType } from '@/types/api';

import { API_BASE_URL } from '@/api/config';

interface TriggerConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId?: string;
    config?: TriggerConfig;
    onSave: (config: TriggerConfig) => void;
    onForceSave?: () => Promise<void> | void;
}

export function TriggerConfigDialog({
    open,
    onOpenChange,
    workflowId = 'NEW_WORKFLOW',
    config,
    onSave,
    onForceSave,
}: TriggerConfigDialogProps) {
    const [type, setType] = useState<TriggerType>(config?.type || 'MANUAL');
    const [webhookActive, setWebhookActive] = useState(config?.webhook?.active ?? true);
    const [webhookMethod, setWebhookMethod] = useState(config?.webhook?.method || 'POST');

    const [scheduleActive, setScheduleActive] = useState(config?.schedule?.active ?? true);
    const [cronExpression, setCronExpression] = useState(config?.schedule?.cronExpression || '');
    const [timezone, setTimezone] = useState(
        config?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setType(config?.type || 'MANUAL');
            setWebhookActive(config?.webhook?.active ?? true);
            setWebhookMethod(config?.webhook?.method || 'POST');
            setScheduleActive(config?.schedule?.active ?? true);
            setCronExpression(config?.schedule?.cronExpression || '');
            setTimezone(config?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
            setCopied(false);
            setIsSaving(false);
        }
    }, [open]);

    const handleUpdate = (updates: Partial<{
        type: TriggerType;
        webhookActive: boolean;
        webhookMethod: string;
        scheduleActive: boolean;
        cronExpression: string;
        timezone: string;
    }>) => {
        const nextState = {
            type,
            webhookActive,
            webhookMethod,
            scheduleActive,
            cronExpression,
            timezone,
            ...updates
        };

        if ('type' in updates) setType(nextState.type);
        if ('webhookActive' in updates) setWebhookActive(nextState.webhookActive);
        if ('webhookMethod' in updates) setWebhookMethod(nextState.webhookMethod);
        if ('scheduleActive' in updates) setScheduleActive(nextState.scheduleActive);
        if ('cronExpression' in updates) setCronExpression(nextState.cronExpression);
        if ('timezone' in updates) setTimezone(nextState.timezone);

        onSave({
            type: nextState.type,
            webhook:
                nextState.type === 'WEBHOOK'
                    ? { active: nextState.webhookActive, method: nextState.webhookMethod }
                    : undefined,
            schedule:
                nextState.type === 'SCHEDULE'
                    ? { active: nextState.scheduleActive, cronExpression: nextState.cronExpression, timezone: nextState.timezone }
                    : undefined,
        });
    };

    const host = window.location.origin;
    const resolvedBase = API_BASE_URL.startsWith('http') ? API_BASE_URL : `${host}${API_BASE_URL.startsWith('/') ? '' : '/'}${API_BASE_URL}`;
    const webhookUrl = `${resolvedBase}/webhooks/${workflowId}`;

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleForceSave = async () => {
        if (!onForceSave) return;
        try {
            setIsSaving(true);
            await onForceSave();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent 
                blocking={false}
                className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
            >
                <div 
                    className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"
                    style={{ borderTopColor: `#64748b55`, borderTopWidth: 3 }}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                            style={{
                                backgroundColor: `#64748b18`,
                                color: `#64748b`,
                            }}
                            aria-hidden
                        >
                            <Play className="h-4 w-4" />
                        </span>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            When workflow runs
                        </DialogTitle>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)}
                            onClick={() => onOpenChange(false)}
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3 scrollbar-thin">
                    <div className="flex w-full bg-muted p-1 rounded-md mb-4">
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                                type === 'MANUAL' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                            }`}
                            onClick={() => handleUpdate({ type: 'MANUAL' })}
                        >
                            <Play className="h-4 w-4" />
                            Manual
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                                type === 'WEBHOOK' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                            }`}
                            onClick={() => handleUpdate({ type: 'WEBHOOK' })}
                        >
                            <Webhook className="h-4 w-4" />
                            Webhook
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                                type === 'SCHEDULE' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                            }`}
                            onClick={() => handleUpdate({ type: 'SCHEDULE' })}
                        >
                            <Clock className="h-4 w-4" />
                            Schedule
                        </button>
                    </div>

                    {type === 'MANUAL' && (
                        <div className="py-6">
                            <div className="text-sm text-muted-foreground text-center">
                                This workflow will only run when you explicitly click the "Run" button or trigger it via the standard execution API.
                            </div>
                        </div>
                    )}

                    {type === 'WEBHOOK' && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="webhook-active" className="text-base font-medium">
                                    Webhook Active
                                </Label>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={webhookActive}
                                    onClick={() => handleUpdate({ webhookActive: !webhookActive })}
                                    className={cn(
                                        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        webhookActive ? "bg-primary" : "bg-input"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                                            webhookActive ? "translate-x-4" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            {workflowId === 'NEW_WORKFLOW' ? (
                                <div className="space-y-2">
                                    <Label>Generated Webhook URL</Label>
                                    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                                        <p className="text-xs">
                                            Create workflow to generate URL.
                                        </p>
                                        {onForceSave && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-7 text-xs border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900" 
                                                onClick={handleForceSave}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Creating...' : 'Create & Generate'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Generated Webhook URL</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={webhookUrl} readOnly className="font-mono text-sm bg-muted" />
                                        <Button size="icon" variant="outline" onClick={handleCopyWebhook}>
                                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>HTTP Method</Label>
                                <Select value={webhookMethod} onValueChange={(val) => handleUpdate({ webhookMethod: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {type === 'SCHEDULE' && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="schedule-active" className="text-base font-medium">
                                    Schedule Active
                                </Label>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={scheduleActive}
                                    onClick={() => handleUpdate({ scheduleActive: !scheduleActive })}
                                    className={cn(
                                        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        scheduleActive ? "bg-primary" : "bg-input"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                                            scheduleActive ? "translate-x-4" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label>Schedule Preset</Label>
                                <Select
                                    value={CRON_PRESETS.find((p) => p.value === cronExpression)?.value || 'custom'}
                                    onValueChange={(val) => {
                                        if (val !== 'custom') {
                                            handleUpdate({ cronExpression: val });
                                        } else {
                                            handleUpdate({ cronExpression: '' });
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CRON_PRESETS.map((preset) => (
                                            <SelectItem key={preset.value} value={preset.value}>
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="custom">Custom Cron Expression</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {!CRON_PRESETS.some((p) => p.value === cronExpression) && (
                                <div className="space-y-2">
                                    <Label>Cron Expression</Label>
                                    <Input
                                        value={cronExpression}
                                        onChange={(e) => handleUpdate({ cronExpression: e.target.value })}
                                        placeholder="0 0/15 * * * *"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Select
                                    value={timezone}
                                    onValueChange={(val) => handleUpdate({ timezone: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a timezone..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Intl.supportedValuesOf('timeZone').map((tz) => (
                                            <SelectItem key={tz} value={tz}>
                                                {tz}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
