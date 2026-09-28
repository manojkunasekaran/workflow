import { useCallback, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, Loader2 } from 'lucide-react';
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
import { webhookTriggerApi } from '@/api/webhookTriggerApi';
import { WebhookActivityPanel } from '@/features/workflow-studio/task-config/WebhookActivityPanel';
import {
    createDefaultSubscribeWebhookConfig,
    SubscribeTriggerTab,
} from '@/features/workflow-studio/task-config/SubscribeTriggerTab';
import { WEBHOOK_DELIVERY_LABELS } from '@/features/workflow-studio/constants/triggerCopy';
import type {
    WebhookConfig,
    WebhookDeliveryMode,
    WebhookInboundConfig,
    WebhookVerificationMode,
} from '@/types/api';

const VERIFICATION_OPTIONS: Array<{ value: WebhookVerificationMode; label: string; description: string }> = [
    { value: 'NONE', label: 'None', description: 'Anyone with the URL can send events.' },
    { value: 'HEADER_SECRET', label: 'Shared secret', description: 'Require a secret value in a header.' },
    { value: 'HMAC_SHA256', label: 'Signature', description: 'Verify a cryptographic signature header.' },
];

export function createDefaultWebhookConfig(): WebhookConfig {
    return {
        deliveryMode: 'PASSIVE',
        active: true,
        method: 'POST',
        inbound: {
            verificationMode: 'NONE',
            ignoreDuplicates: true,
        },
    };
}

interface ReceiveWebhookTabProps {
    workflowId?: string;
    webhook: WebhookConfig;
    onChange: (webhook: WebhookConfig) => void;
    onForceSave?: () => Promise<void> | void;
}

export function ReceiveWebhookTab({
    workflowId,
    webhook,
    onChange,
    onForceSave,
}: ReceiveWebhookTabProps) {
    const [securityOpen, setSecurityOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
    const [urlLoading, setUrlLoading] = useState(false);

    const inbound = webhook.inbound ?? {};
    const canLoadUrl = !!workflowId && workflowId !== 'NEW_WORKFLOW';

    const loadWebhookUrl = useCallback(async () => {
        if (!canLoadUrl || !workflowId) return;
        setUrlLoading(true);
        try {
            const state = await webhookTriggerApi.getWebhookState(workflowId);
            setWebhookUrl(state.webhookUrl ?? null);
        } catch {
            setWebhookUrl(null);
        } finally {
            setUrlLoading(false);
        }
    }, [canLoadUrl, workflowId]);

    const updateWebhook = (patch: Partial<WebhookConfig>) => {
        onChange({ ...webhook, ...patch });
    };

    const updateInbound = (patch: Partial<WebhookInboundConfig>) => {
        onChange({
            ...webhook,
            inbound: { ...inbound, ...patch },
        });
    };

    const handleCopyUrl = () => {
        if (!webhookUrl) return;
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleForceSave = async () => {
        if (!onForceSave) return;
        try {
            setIsSaving(true);
            await onForceSave();
            await loadWebhookUrl();
        } finally {
            setIsSaving(false);
        }
    };

    const verificationMode = inbound.verificationMode ?? 'NONE';
    const deliveryMode = webhook.deliveryMode ?? 'PASSIVE';

    const setDeliveryMode = (mode: WebhookDeliveryMode) => {
        if (mode === 'SUBSCRIBE') {
            onChange({
                ...createDefaultSubscribeWebhookConfig(),
                ...webhook,
                deliveryMode: 'SUBSCRIBE',
            });
            return;
        }
        onChange({
            ...createDefaultWebhookConfig(),
            ...webhook,
            deliveryMode: 'PASSIVE',
        });
    };

    const deliveryModeSelector = (
        <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">How events arrive</p>
            <div className="grid gap-2 sm:grid-cols-2">
                {(Object.entries(WEBHOOK_DELIVERY_LABELS) as Array<[WebhookDeliveryMode, string]>).map(
                    ([mode, label]) => (
                        <label
                            key={mode}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                                deliveryMode === mode ? 'border-primary bg-primary/5' : 'border-border',
                            )}
                        >
                            <input
                                type="radio"
                                name="webhook-delivery-mode"
                                checked={deliveryMode === mode}
                                onChange={() => setDeliveryMode(mode)}
                                className="accent-primary"
                            />
                            {label}
                        </label>
                    ),
                )}
            </div>
        </div>
    );

    if (deliveryMode === 'SUBSCRIBE') {
        return (
            <div className="space-y-5 py-4 min-w-0">
                {deliveryModeSelector}
                <SubscribeTriggerTab workflowId={workflowId} webhook={webhook} onChange={onChange} />
            </div>
        );
    }

    return (
        <div className="space-y-5 py-4 min-w-0">
            {deliveryModeSelector}
            <div className="flex items-center justify-between">
                <Label htmlFor="webhook-active" className="text-base font-medium">
                    Accept incoming events
                </Label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={webhook.active ?? true}
                    onClick={() => updateWebhook({ active: !(webhook.active ?? true) })}
                    className={cn(
                        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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

            <div className="space-y-2">
                <Label>Your webhook URL</Label>
                {!canLoadUrl ? (
                    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                        <p className="text-xs">Save the workflow to generate your URL.</p>
                        {onForceSave && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900"
                                onClick={() => void handleForceSave()}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving…' : 'Save & generate'}
                            </Button>
                        )}
                    </div>
                ) : !webhookUrl ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => void loadWebhookUrl()}
                            disabled={urlLoading}
                        >
                            {urlLoading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    Loading…
                                </>
                            ) : (
                                'Show webhook URL'
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Save the workflow with webhook enabled first.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex min-w-0 items-center gap-2">
                            <Input
                                value={webhookUrl}
                                readOnly
                                className="min-w-0 flex-1 font-mono text-sm bg-muted truncate"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCopyUrl}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Stays the same when you save changes. Paste this URL in your app.
                        </p>
                    </>
                )}
            </div>

            <div className="border-t pt-2">
                <button
                    type="button"
                    className="flex w-full items-center justify-between py-2 text-left"
                    onClick={() => setSecurityOpen((open) => !open)}
                >
                    <span className="text-sm font-medium">Security</span>
                    {securityOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
                {securityOpen && (
                    <div className="space-y-3 pb-2">
                        <Label>Verify events are genuine</Label>
                        <div className="space-y-2">
                            {VERIFICATION_OPTIONS.map((option) => (
                                <label key={option.value} className="flex items-start gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="webhook-verification"
                                        checked={verificationMode === option.value}
                                        onChange={() => updateInbound({ verificationMode: option.value })}
                                        className="accent-primary mt-0.5"
                                    />
                                    <span>
                                        <span className="font-medium">{option.label}</span>
                                        <span className="block text-xs text-muted-foreground">{option.description}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {verificationMode === 'NONE' && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                                Without verification, anyone who knows the URL can trigger this workflow.
                            </p>
                        )}
                        {(verificationMode === 'HEADER_SECRET' || verificationMode === 'HMAC_SHA256') && (
                            <div className="space-y-2 pl-1">
                                <div className="space-y-2">
                                    <Label>Header name</Label>
                                    <Input
                                        value={inbound.headerName ?? ''}
                                        onChange={(e) => updateInbound({ headerName: e.target.value || undefined })}
                                        placeholder={verificationMode === 'HMAC_SHA256' ? 'X-Signature' : 'X-Webhook-Secret'}
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Secret</Label>
                                    <Input
                                        type="password"
                                        value={inbound.secret ?? ''}
                                        onChange={(e) => updateInbound({ secret: e.target.value || undefined })}
                                        placeholder="Your signing secret"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="ignore-duplicates" className="text-sm font-medium">
                        Ignore duplicate events
                    </Label>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={inbound.ignoreDuplicates ?? true}
                        onClick={() => updateInbound({ ignoreDuplicates: !(inbound.ignoreDuplicates ?? true) })}
                        className={cn(
                            'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                            inbound.ignoreDuplicates ?? true ? 'bg-primary' : 'bg-input',
                        )}
                    >
                        <span
                            className={cn(
                                'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                                inbound.ignoreDuplicates ?? true ? 'translate-x-4' : 'translate-x-0',
                            )}
                        />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Prevents the same event from running the workflow twice.
                </p>
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
                            <Label>HTTP method</Label>
                            <Select
                                value={webhook.method ?? 'POST'}
                                onValueChange={(val) => updateWebhook({ method: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Use GET only for apps that require a challenge handshake.
                            </p>
                        </div>
                        {(inbound.ignoreDuplicates ?? true) && (
                            <div className="space-y-2">
                                <Label>Event id field path</Label>
                                <Input
                                    value={inbound.eventIdPath ?? ''}
                                    onChange={(e) => updateInbound({ eventIdPath: e.target.value || undefined })}
                                    placeholder="$.id"
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Payload field path</Label>
                            <Input
                                value={inbound.payloadPath ?? ''}
                                onChange={(e) => updateInbound({ payloadPath: e.target.value || undefined })}
                                placeholder="Leave empty to use full body"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <WebhookActivityPanel workflowId={workflowId} />
            </div>
        </div>
    );
}
