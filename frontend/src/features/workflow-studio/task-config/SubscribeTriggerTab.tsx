import { useCallback, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    FlaskConical,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskFieldRenderer } from '@/features/workflow-studio/task-config/TaskFieldRenderer';
import { TaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import { HTTP_REQUEST_FIELDS } from '@/features/workflow-studio/task-type-schema/plugins/httpRequestFields';
import { SubscribeActivityPanel } from '@/features/workflow-studio/task-config/SubscribeActivityPanel';
import { ConnectorTriggerPicker } from '@/features/workflow-studio/task-config/ConnectorTriggerPicker';
import { applySubscribeTriggerPreset } from '@/features/workflow-studio/task-config/connectorTriggerUtils';
import { subscribeTriggerApi } from '@/api/subscribeTriggerApi';
import type {
    PollHttpConfig,
    WebhookConfig,
    WebhookInboundConfig,
    WebhookVerificationMode,
} from '@/types/api';

const VERIFICATION_OPTIONS: Array<{ value: WebhookVerificationMode; label: string }> = [
    { value: 'NONE', label: 'None' },
    { value: 'HEADER_SECRET', label: 'Shared secret' },
    { value: 'HMAC_SHA256', label: 'Signature' },
];

export function createDefaultSubscribeWebhookConfig(): WebhookConfig {
    return {
        deliveryMode: 'SUBSCRIBE',
        active: true,
        subscribeHttp: {
            method: 'POST',
            url: '',
            headers: {},
            timeoutMs: 30_000,
        },
        unsubscribeHttp: {
            method: 'DELETE',
            url: '',
            headers: {},
            timeoutMs: 30_000,
        },
        inbound: {
            verificationMode: 'NONE',
            ignoreDuplicates: true,
        },
    };
}

interface SubscribeTriggerTabProps {
    workflowId?: string;
    webhook: WebhookConfig;
    onChange: (webhook: WebhookConfig) => void;
}

export function SubscribeTriggerTab({ workflowId, webhook, onChange }: SubscribeTriggerTabProps) {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [testRunning, setTestRunning] = useState(false);
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

    const inbound = webhook.inbound ?? {};
    const canLoad = !!workflowId && workflowId !== 'NEW_WORKFLOW';

    const updateWebhook = (patch: Partial<WebhookConfig>) => {
        onChange({ ...webhook, ...patch });
    };

    const updateInbound = (patch: Partial<WebhookInboundConfig>) => {
        onChange({
            ...webhook,
            inbound: { ...inbound, ...patch },
        });
    };

    const updateSubscribeHttp = (http: Record<string, unknown>) => {
        onChange({
            ...webhook,
            subscribeHttp: { ...webhook.subscribeHttp, ...http } as PollHttpConfig,
        });
    };

    const updateUnsubscribeHttp = (http: Record<string, unknown>) => {
        onChange({
            ...webhook,
            unsubscribeHttp: { ...webhook.unsubscribeHttp, ...http } as PollHttpConfig,
        });
    };

    const handleTestRegistration = async () => {
        if (!canLoad || !workflowId) return;
        setTestRunning(true);
        setTestMessage(null);
        setTestSuccess(null);
        try {
            const result = await subscribeTriggerApi.testSubscribe(workflowId);
            setTestSuccess(result.success);
            if (result.success) {
                const subId = result.extractedSubscriptionId
                    ? ` Subscription id: ${result.extractedSubscriptionId}.`
                    : '';
                setTestMessage(`Registration test succeeded (${result.durationMs}ms).${subId}`);
            } else {
                setTestMessage(result.error ?? 'Registration test failed.');
            }
        } catch (err: unknown) {
            setTestSuccess(false);
            setTestMessage(err instanceof Error ? err.message : 'Registration test failed.');
        } finally {
            setTestRunning(false);
        }
    };

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
            onChange(applySubscribeTriggerPreset(trigger, connectorId, inputs, credentialId));
        },
        [onChange],
    );

    return (
        <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="subscribe-active" className="text-base font-medium">
                    Active
                </Label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={webhook.active ?? true}
                    onClick={() => updateWebhook({ active: !(webhook.active ?? true) })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                        webhook.active ?? true ? 'bg-primary' : 'bg-input',
                    )}
                >
                    <span
                        className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                            webhook.active ?? true ? 'translate-x-4' : 'translate-x-0',
                        )}
                    />
                </button>
            </div>

            <div className="space-y-2 rounded-md border p-3 min-w-0">
                <p className="text-sm font-medium">1. What to watch</p>
                <ConnectorTriggerPicker
                    embedded
                    triggerType="WEBHOOK_SUBSCRIBE"
                    connectorId={webhook.connectorId}
                    connectorTriggerId={webhook.connectorTriggerId}
                    connectorInputs={webhook.connectorInputs}
                    credentialId={webhook.subscribeHttp?.credentialId}
                    onApply={handleConnectorTriggerApply}
                />
            </div>

            <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">2. We&apos;ll register automatically</p>
                <p className="text-sm text-muted-foreground">
                    {canLoad
                        ? 'Registration runs when you save. Use View activity to check status.'
                        : 'Save the workflow first, then we register with the app.'}
                </p>
            </div>

            <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">3. Test registration</p>
                <p className="text-xs text-muted-foreground">
                    Sends a dry-run register request. Nothing is saved to your app.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!canLoad || testRunning}
                    onClick={() => void handleTestRegistration()}
                >
                    {testRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <FlaskConical className="h-3.5 w-3.5" />
                    )}
                    Test registration
                </Button>
                {testMessage && (
                    <p className={cn(
                        'text-xs flex items-center gap-1',
                        testSuccess ? 'text-green-600 dark:text-green-400' : 'text-destructive',
                    )}>
                        {testSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {testMessage}
                    </p>
                )}
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
                    <div className="space-y-4 pb-2">
                        <div className="space-y-2">
                            <Label className="text-base">Subscribe HTTP</Label>
                            <TaskConfigContext.Provider value={{ workflowTasks: [], taskOrder: [] }}>
                                {HTTP_REQUEST_FIELDS.filter((f) => f.key !== 'credentialId').map((field) => (
                                    <TaskFieldRenderer
                                        key={`sub-${field.key}`}
                                        field={field}
                                        parameters={(webhook.subscribeHttp ?? {}) as Record<string, unknown>}
                                        onChange={updateSubscribeHttp}
                                    />
                                ))}
                            </TaskConfigContext.Provider>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-base">Unsubscribe HTTP</Label>
                            <TaskConfigContext.Provider value={{ workflowTasks: [], taskOrder: [] }}>
                                {HTTP_REQUEST_FIELDS.filter((f) => f.key !== 'credentialId').map((field) => (
                                    <TaskFieldRenderer
                                        key={`unsub-${field.key}`}
                                        field={field}
                                        parameters={(webhook.unsubscribeHttp ?? {}) as Record<string, unknown>}
                                        onChange={updateUnsubscribeHttp}
                                    />
                                ))}
                            </TaskConfigContext.Provider>
                        </div>

                        <div className="space-y-2">
                            <Label>Subscription id field path</Label>
                            <Input
                                value={webhook.subscriptionIdPath ?? ''}
                                onChange={(e) => updateWebhook({ subscriptionIdPath: e.target.value || undefined })}
                                placeholder="$.subscription.id"
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Event id field path</Label>
                            <Input
                                value={inbound.eventIdPath ?? ''}
                                onChange={(e) => updateInbound({ eventIdPath: e.target.value || undefined })}
                                placeholder="$.id"
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payload field path</Label>
                            <Input
                                value={inbound.payloadPath ?? ''}
                                onChange={(e) => updateInbound({ payloadPath: e.target.value || undefined })}
                                placeholder="Leave empty to use full body"
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Verification</Label>
                            <div className="space-y-2">
                                {VERIFICATION_OPTIONS.map((option) => (
                                    <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="subscribe-verification"
                                            checked={(inbound.verificationMode ?? 'NONE') === option.value}
                                            onChange={() => updateInbound({ verificationMode: option.value })}
                                            className="accent-primary"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                            {(inbound.verificationMode === 'HEADER_SECRET' || inbound.verificationMode === 'HMAC_SHA256') && (
                                <div className="space-y-2 pl-1">
                                    <Input
                                        value={inbound.headerName ?? ''}
                                        onChange={(e) => updateInbound({ headerName: e.target.value || undefined })}
                                        placeholder="Header name"
                                        className="font-mono text-sm"
                                    />
                                    <Input
                                        type="password"
                                        value={inbound.secret ?? ''}
                                        onChange={(e) => updateInbound({ secret: e.target.value || undefined })}
                                        placeholder="Secret"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <SubscribeActivityPanel workflowId={workflowId} />
            </div>
        </div>
    );
}
