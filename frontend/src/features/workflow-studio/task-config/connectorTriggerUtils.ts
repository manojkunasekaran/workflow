import type {
    ConnectorInputField,
    ConnectorManifest,
    ConnectorTrigger,
} from '@/api/connectorApi';
import type { PollConfig, WebhookConfig } from '@/types/api';
import { createDefaultPollConfig } from '@/features/workflow-studio/task-config/PollTriggerTab';
import { createDefaultSubscribeWebhookConfig } from '@/features/workflow-studio/task-config/SubscribeTriggerTab';

/** Studio picker kind — subscribe presets are WEBHOOK triggers with deliveryMode SUBSCRIBE. */
export type ConnectorTriggerKind = 'POLL' | 'WEBHOOK_SUBSCRIBE';

function substituteValue(value: string, inputs: Record<string, string>): string {
    return value.replace(/\{(\w+)\}/g, (_, key: string) => inputs[key] ?? `{${key}}`);
}

function substituteDeep<T>(value: T, inputs: Record<string, string>): T {
    if (typeof value === 'string') {
        return substituteValue(value, inputs) as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => substituteDeep(item, inputs)) as T;
    }
    if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            result[key] = substituteDeep(nested, inputs);
        }
        return result as T;
    }
    return value;
}

function mergePollConfig(base: PollConfig, patch: Partial<PollConfig>): PollConfig {
    return {
        ...base,
        ...patch,
        schedule: { ...base.schedule, ...patch.schedule },
        http: { ...base.http, ...patch.http },
        detection: patch.detection
            ? { ...base.detection, ...patch.detection }
            : base.detection,
        filters: patch.filters ?? base.filters,
        connectorInputs: patch.connectorInputs ?? base.connectorInputs,
    };
}

function mergeWebhookConfig(base: WebhookConfig, patch: Partial<WebhookConfig>): WebhookConfig {
    return {
        ...base,
        ...patch,
        subscribeHttp: patch.subscribeHttp
            ? { ...base.subscribeHttp, ...patch.subscribeHttp }
            : base.subscribeHttp,
        unsubscribeHttp: patch.unsubscribeHttp
            ? { ...base.unsubscribeHttp, ...patch.unsubscribeHttp }
            : base.unsubscribeHttp,
        inbound: patch.inbound ? { ...base.inbound, ...patch.inbound } : base.inbound,
        connectorInputs: patch.connectorInputs ?? base.connectorInputs,
    };
}

function matchesTriggerKind(trigger: ConnectorTrigger, kind: ConnectorTriggerKind): boolean {
    if (kind === 'POLL') {
        return trigger.triggerType === 'POLL';
    }
    return trigger.triggerType === 'WEBHOOK' && trigger.preset?.webhook?.deliveryMode === 'SUBSCRIBE';
}

export function connectorsWithTriggers(
    connectors: ConnectorManifest[],
    kind: ConnectorTriggerKind,
): ConnectorManifest[] {
    return connectors.filter((connector) =>
        (connector.triggers ?? []).some((trigger) => matchesTriggerKind(trigger, kind)),
    );
}

export function triggersForConnector(
    connector: ConnectorManifest | undefined,
    kind: ConnectorTriggerKind,
): ConnectorTrigger[] {
    return (connector?.triggers ?? []).filter((trigger) => matchesTriggerKind(trigger, kind));
}

export function applyPollTriggerPreset(
    trigger: ConnectorTrigger,
    connectorId: string,
    inputs: Record<string, string>,
    credentialId?: string,
): PollConfig {
    const preset = substituteDeep(trigger.preset?.poll ?? {}, inputs) as Partial<PollConfig>;
    const merged = mergePollConfig(createDefaultPollConfig(), preset);
    merged.connectorId = connectorId;
    merged.connectorTriggerId = trigger.triggerId;
    merged.connectorInputs = inputs;
    if (credentialId) {
        merged.http = { ...merged.http, credentialId };
    }
    return merged;
}

export function applySubscribeTriggerPreset(
    trigger: ConnectorTrigger,
    connectorId: string,
    inputs: Record<string, string>,
    credentialId?: string,
): WebhookConfig {
    const preset = substituteDeep(trigger.preset?.webhook ?? {}, inputs) as Partial<WebhookConfig>;
    const merged = mergeWebhookConfig(createDefaultSubscribeWebhookConfig(), preset);
    merged.connectorId = connectorId;
    merged.connectorTriggerId = trigger.triggerId;
    merged.connectorInputs = inputs;
    merged.deliveryMode = 'SUBSCRIBE';
    if (credentialId) {
        merged.subscribeHttp = { ...merged.subscribeHttp, credentialId };
        merged.unsubscribeHttp = { ...merged.unsubscribeHttp, credentialId };
    }
    return merged;
}

export function defaultInputsForSchema(fields: ConnectorInputField[]): Record<string, string> {
    const inputs: Record<string, string> = {};
    for (const field of fields) {
        if (field.defaultValue != null && field.defaultValue !== '') {
            inputs[field.key] = String(field.defaultValue);
        }
    }
    return inputs;
}
