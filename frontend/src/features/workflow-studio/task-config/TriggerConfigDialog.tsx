import { useState, useEffect } from 'react';
import { Play, Webhook, Clock, RefreshCw, Plug, X } from 'lucide-react';
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
import {
    createDefaultPollConfig,
    PollTriggerTab,
} from '@/features/workflow-studio/task-config/PollTriggerTab';
import {
    createDefaultWebhookConfig,
    ReceiveWebhookTab,
} from '@/features/workflow-studio/task-config/ReceiveWebhookTab';
import {
    createDefaultMcpConfig,
    McpTriggerTab,
} from '@/features/workflow-studio/task-config/McpTriggerTab';
import { TRIGGER_TYPE_LABELS } from '@/features/workflow-studio/constants/triggerCopy';
import type {
    McpTriggerConfig,
    PollConfig,
    TriggerConfig,
    TriggerType,
    WebhookConfig,
    WorkflowTask,
} from '@/types/api';

interface TriggerConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId?: string;
    tasks?: WorkflowTask[];
    config?: TriggerConfig;
    onSave: (config: TriggerConfig) => void;
    onForceSave?: () => Promise<void> | void;
}

function buildTriggerConfig(state: {
    type: TriggerType;
    webhook: WebhookConfig;
    scheduleActive: boolean;
    cronExpression: string;
    timezone: string;
    poll: PollConfig;
    mcp: McpTriggerConfig;
}): TriggerConfig {
    return {
        type: state.type,
        webhook: state.type === 'WEBHOOK' ? state.webhook : undefined,
        schedule:
            state.type === 'SCHEDULE'
                ? { active: state.scheduleActive, cronExpression: state.cronExpression, timezone: state.timezone }
                : undefined,
        poll: state.type === 'POLL' ? state.poll : undefined,
        mcp: state.type === 'MCP' ? state.mcp : undefined,
    };
}

const TRIGGER_TABS: Array<{ type: TriggerType; icon: typeof Play }> = [
    { type: 'MANUAL', icon: Play },
    { type: 'WEBHOOK', icon: Webhook },
    { type: 'SCHEDULE', icon: Clock },
    { type: 'POLL', icon: RefreshCw },
    { type: 'MCP', icon: Plug },
];

export function TriggerConfigDialog({
    open,
    onOpenChange,
    workflowId = 'NEW_WORKFLOW',
    tasks = [],
    config,
    onSave,
    onForceSave,
}: TriggerConfigDialogProps) {
    const [type, setType] = useState<TriggerType>(config?.type || 'MANUAL');
    const [webhook, setWebhook] = useState<WebhookConfig>(config?.webhook ?? createDefaultWebhookConfig());

    const [scheduleActive, setScheduleActive] = useState(config?.schedule?.active ?? true);
    const [cronExpression, setCronExpression] = useState(config?.schedule?.cronExpression || '');
    const [timezone, setTimezone] = useState(
        config?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    );

    const [poll, setPoll] = useState<PollConfig>(config?.poll ?? createDefaultPollConfig());
    const [mcp, setMcp] = useState<McpTriggerConfig>(config?.mcp ?? createDefaultMcpConfig());

    useEffect(() => {
        if (open) {
            setType(config?.type || 'MANUAL');
            setWebhook(config?.webhook ?? createDefaultWebhookConfig());
            setScheduleActive(config?.schedule?.active ?? true);
            setCronExpression(config?.schedule?.cronExpression || '');
            setTimezone(config?.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
            setPoll(config?.poll ?? createDefaultPollConfig());
            setMcp(config?.mcp ?? createDefaultMcpConfig());
        }
    }, [open]);

    const emitSave = (updates: Partial<{
        type: TriggerType;
        webhook: WebhookConfig;
        scheduleActive: boolean;
        cronExpression: string;
        timezone: string;
        poll: PollConfig;
        mcp: McpTriggerConfig;
    }>) => {
        const nextState = {
            type,
            webhook,
            scheduleActive,
            cronExpression,
            timezone,
            poll,
            mcp,
            ...updates,
        };

        if ('type' in updates) setType(nextState.type);
        if ('webhook' in updates) setWebhook(nextState.webhook);
        if ('scheduleActive' in updates) setScheduleActive(nextState.scheduleActive);
        if ('cronExpression' in updates) setCronExpression(nextState.cronExpression);
        if ('timezone' in updates) setTimezone(nextState.timezone);
        if ('poll' in updates) setPoll(nextState.poll);
        if ('mcp' in updates) setMcp(nextState.mcp);

        onSave(buildTriggerConfig(nextState));
    };

    const tabButtonClass = (active: boolean) => cn(
        'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 text-[10px] font-medium rounded-sm transition-all sm:gap-1.5 sm:px-2 sm:text-xs',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50',
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent
                blocking={false}
                className="flex max-h-[90vh] flex-col p-0 sm:max-w-2xl"
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

                <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pb-5 pt-3 scrollbar-thin">
                    <div className="mb-4 flex w-full min-w-0 rounded-md bg-muted p-1">
                        {TRIGGER_TABS.map(({ type: tabType, icon: Icon }) => (
                            <button
                                key={tabType}
                                className={cn(tabButtonClass(type === tabType), 'min-w-0')}
                                onClick={() => emitSave({ type: tabType })}
                                title={TRIGGER_TYPE_LABELS[tabType]}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                                <span className="truncate">{TRIGGER_TYPE_LABELS[tabType]}</span>
                            </button>
                        ))}
                    </div>

                    {type === 'MANUAL' && (
                        <div className="py-6">
                            <div className="text-sm text-muted-foreground text-center">
                                This workflow will only run when you explicitly click the &quot;Run&quot; button or trigger it via the standard execution API.
                            </div>
                        </div>
                    )}

                    {type === 'WEBHOOK' && (
                        <ReceiveWebhookTab
                            workflowId={workflowId}
                            webhook={webhook}
                            onChange={(nextWebhook) => emitSave({ webhook: nextWebhook })}
                            onForceSave={onForceSave}
                        />
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
                                    onClick={() => emitSave({ scheduleActive: !scheduleActive })}
                                    className={cn(
                                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                        scheduleActive ? 'bg-primary' : 'bg-input',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                                            scheduleActive ? 'translate-x-4' : 'translate-x-0',
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
                                            emitSave({ cronExpression: val });
                                        } else {
                                            emitSave({ cronExpression: '' });
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
                                        onChange={(e) => emitSave({ cronExpression: e.target.value })}
                                        placeholder="0 0/15 * * * *"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Select
                                    value={timezone}
                                    onValueChange={(val) => emitSave({ timezone: val })}
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

                    {type === 'POLL' && (
                        <PollTriggerTab
                            workflowId={workflowId}
                            poll={poll}
                            onChange={(nextPoll) => emitSave({ poll: nextPoll })}
                        />
                    )}

                    {type === 'MCP' && (
                        <McpTriggerTab
                            workflowId={workflowId}
                            mcp={mcp}
                            tasks={tasks}
                            onChange={(nextMcp) => emitSave({ mcp: nextMcp })}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
