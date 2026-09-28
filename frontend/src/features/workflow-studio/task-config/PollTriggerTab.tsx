import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CRON_PRESETS } from '@/features/workflow-studio/lib/cronPresets';
import { describePollSchedule } from '@/features/workflow-studio/lib/pollSchedulePreview';
import { WaitDurationField } from '@/features/workflow-studio/task-config/WaitDurationField';
import { TaskFieldRenderer } from '@/features/workflow-studio/task-config/TaskFieldRenderer';
import { TaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import { HTTP_REQUEST_FIELDS } from '@/features/workflow-studio/task-type-schema/plugins/httpRequestFields';
import { PollTestPanel } from '@/features/workflow-studio/task-config/PollTestPanel';
import { PollActivityPanel } from '@/features/workflow-studio/task-config/PollActivityPanel';
import { ConnectorTriggerPicker } from '@/features/workflow-studio/task-config/ConnectorTriggerPicker';
import { applyPollTriggerPreset } from '@/features/workflow-studio/task-config/connectorTriggerUtils';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type {
    ChangeDetectionConfig,
    PollConfig,
    PollEpoch,
    PollEventSemantics,
    PollFilter,
    PollRunMode,
    PollScheduleMode,
    UniqueKeyMode,
} from '@/types/api';

const SEMANTICS_OPTIONS: Array<{ value: PollEventSemantics; label: string }> = [
    { value: 'NEW_ITEMS', label: 'New items' },
    { value: 'UPDATED', label: 'Updated' },
    { value: 'NEW_OR_UPDATED', label: 'New or updated' },
    { value: 'RESPONSE_CHANGED', label: 'Response changed' },
];

const EPOCH_OPTIONS: Array<{ value: PollEpoch; label: string }> = [
    { value: 'NOW', label: 'From now' },
    { value: 'ALL', label: 'Include existing' },
    { value: 'FROM_DATE', label: 'From date' },
];

const RUN_MODE_OPTIONS: Array<{ value: PollRunMode; label: string }> = [
    { value: 'PER_ITEM', label: 'Once per item' },
    { value: 'BATCH', label: 'Once with all new items' },
];

export function createDefaultPollConfig(): PollConfig {
    return {
        active: true,
        schedule: {
            mode: 'FIXED_INTERVAL',
            intervalSeconds: 300,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        semantics: 'NEW_ITEMS',
        epoch: 'NOW',
        runMode: 'PER_ITEM',
        http: {
            method: 'GET',
            url: '',
            headers: {},
            timeoutMs: 30_000,
        },
        detection: {
            keyPaths: ['id'],
            uniqueKeyMode: 'FIELD',
            maxItemsPerPoll: 1000,
        },
        filters: [],
    };
}

const FILTER_OPERATORS = [
    { value: 'EQ', label: 'equals' },
    { value: 'NE', label: 'not equals' },
    { value: 'GT', label: 'greater than' },
    { value: 'GTE', label: 'greater or equal' },
    { value: 'LT', label: 'less than' },
    { value: 'LTE', label: 'less or equal' },
    { value: 'CONTAINS', label: 'contains' },
];

function pathsToString(paths?: string[]): string {
    return paths?.join(', ') ?? '';
}

function stringToPaths(raw: string): string[] {
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

interface PollTriggerTabProps {
    workflowId?: string;
    poll: PollConfig;
    onChange: (poll: PollConfig) => void;
}

export function PollTriggerTab({ workflowId, poll, onChange }: PollTriggerTabProps) {
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const updatePoll = (patch: Partial<PollConfig>) => {
        onChange({ ...poll, ...patch });
    };

    const updateSchedule = (patch: Partial<PollConfig['schedule']>) => {
        onChange({
            ...poll,
            schedule: { ...poll.schedule, ...patch },
        });
    };

    const updateHttp = (http: Record<string, unknown>) => {
        onChange({
            ...poll,
            http: {
                ...poll.http,
                ...http,
            },
        });
    };

    const updateDetection = (patch: Partial<ChangeDetectionConfig>) => {
        onChange({
            ...poll,
            detection: { ...poll.detection, ...patch },
        });
    };

    const updateFilters = (filters: PollFilter[]) => {
        onChange({ ...poll, filters });
    };

    const addFilter = () => {
        updateFilters([...(poll.filters ?? []), { field: '', operator: 'EQ', value: '' }]);
    };

    const updateFilter = (index: number, patch: Partial<PollFilter>) => {
        const filters = [...(poll.filters ?? [])];
        filters[index] = { ...filters[index], ...patch };
        updateFilters(filters);
    };

    const removeFilter = (index: number) => {
        updateFilters((poll.filters ?? []).filter((_, i) => i !== index));
    };

    const scheduleMode = poll.schedule?.mode ?? 'FIXED_INTERVAL';
    const uniqueKeyMode: UniqueKeyMode = poll.detection?.uniqueKeyMode ?? 'FIELD';
    const showItemKeyConfig = poll.semantics !== 'RESPONSE_CHANGED';
    const cronExpression = poll.schedule?.cronExpression ?? '';
    const timezone = poll.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    const handleConnectorTriggerApply = useCallback(
        ({
            connectorId,
            trigger,
            inputs,
            credentialId,
        }: {
            connectorId: string;
            trigger: import('@/api/connectorApi').ConnectorTrigger;
            inputs: Record<string, string>;
            credentialId?: string;
        }) => {
            onChange(applyPollTriggerPreset(trigger, connectorId, inputs, credentialId));
        },
        [onChange],
    );

    return (
        <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="poll-active" className="text-base font-medium">
                    Poll Active
                </Label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={poll.active ?? true}
                    onClick={() => updatePoll({ active: !(poll.active ?? true) })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        poll.active ?? true ? 'bg-primary' : 'bg-input',
                    )}
                >
                    <span
                        className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                            poll.active ?? true ? 'translate-x-4' : 'translate-x-0',
                        )}
                    />
                </button>
            </div>

            <ConnectorTriggerPicker
                triggerType="POLL"
                connectorId={poll.connectorId}
                connectorTriggerId={poll.connectorTriggerId}
                connectorInputs={poll.connectorInputs}
                credentialId={poll.http?.credentialId}
                onApply={handleConnectorTriggerApply}
            />

            <div className="space-y-2">
                <Label>When to run</Label>
                <div className="space-y-2">
                    {SEMANTICS_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="radio"
                                name="poll-semantics"
                                checked={poll.semantics === option.value}
                                onChange={() => updatePoll({ semantics: option.value })}
                                className="accent-primary"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label>How often</Label>
                <div className="flex w-full rounded-md bg-muted p-1">
                    {(['FIXED_INTERVAL', 'CRON'] as PollScheduleMode[]).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            className={cn(
                                'flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                                scheduleMode === mode
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-background/50',
                            )}
                            onClick={() => updateSchedule({ mode })}
                        >
                            {mode === 'FIXED_INTERVAL' ? 'Fixed interval' : 'Cron expression'}
                        </button>
                    ))}
                </div>

                {scheduleMode === 'FIXED_INTERVAL' ? (
                    <WaitDurationField
                        id="poll-interval"
                        label={<span className="text-sm font-medium">Interval</span>}
                        valueMs={poll.schedule?.intervalSeconds ?? 300}
                        onChange={(intervalSeconds) => updateSchedule({ intervalSeconds })}
                        storageUnit="seconds"
                    />
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Schedule Preset</Label>
                            <Select
                                value={CRON_PRESETS.find((p) => p.value === cronExpression)?.value || 'custom'}
                                onValueChange={(val) => {
                                    if (val !== 'custom') {
                                        updateSchedule({ cronExpression: val });
                                    } else {
                                        updateSchedule({ cronExpression: '' });
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
                                    onChange={(e) => updateSchedule({ cronExpression: e.target.value })}
                                    placeholder="0 0/15 * * * *"
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Select
                                value={timezone}
                                onValueChange={(val) => updateSchedule({ timezone: val })}
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
                    </>
                )}

                <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                    {describePollSchedule(poll.schedule)}
                </p>
            </div>

            <div className="space-y-2">
                <Label>Where to start</Label>
                <div className="space-y-2">
                    {EPOCH_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="radio"
                                name="poll-epoch"
                                checked={poll.epoch === option.value}
                                onChange={() => updatePoll({ epoch: option.value })}
                                className="accent-primary"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
                {poll.epoch === 'FROM_DATE' && (
                    <div className="space-y-2 pl-6">
                        <Input
                            type="date"
                            value={poll.epochDate?.slice(0, 10) ?? ''}
                            onChange={(e) => updatePoll({ epochDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
                        />
                        <div className="space-y-2">
                            <Label>Item timestamp path</Label>
                            <Input
                                value={poll.detection?.timestampPath ?? ''}
                                onChange={(e) => updateDetection({ timestampPath: e.target.value || undefined })}
                                placeholder="$.updatedAt"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Items before the selected date are recorded as seen and will not trigger on the first pass.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Run mode</Label>
                <div className="space-y-2">
                    {RUN_MODE_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="radio"
                                name="poll-run-mode"
                                checked={poll.runMode === option.value}
                                onChange={() => updatePoll({ runMode: option.value })}
                                className="accent-primary"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-3 border-t pt-4">
                <Label className="text-base">HTTP request</Label>
                <TaskConfigContext.Provider value={{ workflowTasks: [], taskOrder: [] }}>
                    {HTTP_REQUEST_FIELDS.map((field) => (
                        <TaskFieldRenderer
                            key={field.key}
                            field={field}
                            parameters={poll.http as Record<string, unknown>}
                            onChange={updateHttp}
                        />
                    ))}
                </TaskConfigContext.Provider>
            </div>

            <div className="border-t pt-2">
                <button
                    type="button"
                    className="flex w-full items-center justify-between py-2 text-left"
                    onClick={() => setAdvancedOpen((open) => !open)}
                >
                    <span className="text-sm font-medium">Advanced</span>
                    {advancedOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
                {advancedOpen && (
                    <div className="space-y-3 pb-2">
                        <div className="space-y-2">
                            <Label>Items path (JsonPath)</Label>
                            <Input
                                value={poll.detection?.itemsPath ?? ''}
                                onChange={(e) => updateDetection({ itemsPath: e.target.value || undefined })}
                                placeholder="$.items"
                                className="font-mono text-sm"
                            />
                        </div>
                        {showItemKeyConfig && (
                            <div className="space-y-3">
                                <Label>How to identify items</Label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="unique-key-mode"
                                            checked={uniqueKeyMode === 'FIELD'}
                                            onChange={() => updateDetection({ uniqueKeyMode: 'FIELD' })}
                                            className="accent-primary"
                                        />
                                        ID field(s)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="unique-key-mode"
                                            checked={uniqueKeyMode === 'CONTENT_HASH'}
                                            onChange={() => updateDetection({ uniqueKeyMode: 'CONTENT_HASH' })}
                                            className="accent-primary"
                                        />
                                        Content fingerprint
                                    </label>
                                </div>
                                {uniqueKeyMode === 'FIELD' ? (
                                    <div className="space-y-2">
                                        <Label>ID field path(s)</Label>
                                        <Input
                                            value={pathsToString(poll.detection?.keyPaths)}
                                            onChange={(e) => updateDetection({ keyPaths: stringToPaths(e.target.value) })}
                                            placeholder="id"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Fields to include (optional)</Label>
                                        <Input
                                            value={pathsToString(poll.detection?.contentHashPaths)}
                                            onChange={(e) => updateDetection({ contentHashPaths: stringToPaths(e.target.value) })}
                                            placeholder="$.name, $.status"
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty to fingerprint the entire item. Changes to included fields create a new item.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Update key path</Label>
                            <Input
                                value={poll.detection?.updateKeyPath ?? ''}
                                onChange={(e) => updateDetection({ updateKeyPath: e.target.value || undefined })}
                                placeholder="updatedAt"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max items per poll</Label>
                            <Input
                                type="number"
                                min={1}
                                value={poll.detection?.maxItemsPerPoll ?? 1000}
                                onChange={(e) => {
                                    const parsed = Number(e.target.value);
                                    if (Number.isFinite(parsed) && parsed > 0) {
                                        updateDetection({ maxItemsPerPoll: parsed });
                                    }
                                }}
                            />
                        </div>
                        {poll.semantics === 'RESPONSE_CHANGED' && (
                            <div className="space-y-2">
                                <Label>Ignore fields for change detection</Label>
                                <Input
                                    value={pathsToString(poll.detection?.hashIgnorePaths)}
                                    onChange={(e) => updateDetection({ hashIgnorePaths: stringToPaths(e.target.value) })}
                                    placeholder="$.timestamp, $.requestId"
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Exclude volatile fields like timestamps or request IDs so only meaningful response changes trigger.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Item filters</Label>
                                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addFilter}>
                                    <Plus className="h-3.5 w-3.5" />
                                    Add rule
                                </Button>
                            </div>
                            {(poll.filters ?? []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No filters — all parsed items are evaluated.</p>
                            ) : (
                                <div className="space-y-2">
                                    {(poll.filters ?? []).map((filter, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <Input
                                                value={filter.field ?? ''}
                                                onChange={(e) => updateFilter(index, { field: e.target.value })}
                                                placeholder="field or $.path"
                                                className="font-mono text-sm flex-1"
                                            />
                                            <Select
                                                value={filter.operator ?? 'EQ'}
                                                onValueChange={(val) => updateFilter(index, { operator: val })}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FILTER_OPERATORS.map((op) => (
                                                        <SelectItem key={op.value} value={op.value}>
                                                            {op.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                value={filter.value != null ? String(filter.value) : ''}
                                                onChange={(e) => updateFilter(index, { value: e.target.value })}
                                                placeholder="value"
                                                className="text-sm flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                onClick={() => removeFilter(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <PollActivityPanel workflowId={workflowId} />
            </div>

            <div className="flex justify-end border-t pt-4">
                <PollTestPanel workflowId={workflowId} />
            </div>
        </div>
    );
}
