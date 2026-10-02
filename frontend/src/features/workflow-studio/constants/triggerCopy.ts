import type { TriggerType } from '@/types/api';

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
    MANUAL: 'Run manually',
    WEBHOOK: 'Webhook',
    SCHEDULE: 'On a schedule',
    POLL: 'Check for changes',
    MCP: 'MCP tool',
};

export const TRIGGER_TYPE_HELPERS: Partial<Record<TriggerType, string>> = {
    WEBHOOK: 'Paste a URL or let the app register for you',
    MCP: 'Expose this workflow as an MCP tool',
};

export const WEBHOOK_DELIVERY_LABELS = {
    PASSIVE: 'I paste the URL',
    SUBSCRIBE: 'App registers for me',
} as const;
