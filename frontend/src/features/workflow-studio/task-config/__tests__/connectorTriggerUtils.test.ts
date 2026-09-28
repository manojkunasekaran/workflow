import { describe, expect, it } from 'vitest';
import {
    applyPollTriggerPreset,
    applySubscribeTriggerPreset,
} from '@/features/workflow-studio/task-config/connectorTriggerUtils';
import type { ConnectorTrigger } from '@/api/connectorApi';

describe('connectorTriggerUtils', () => {
    it('applyPollTriggerPreset substitutes user inputs into poll URL', () => {
        const trigger: ConnectorTrigger = {
            triggerId: 'new_issues',
            displayName: 'New issues',
            triggerType: 'POLL',
            preset: {
                poll: {
                    http: {
                        method: 'GET',
                        url: 'https://api.github.com/repos/{owner}/{repo}/issues',
                    },
                    detection: { keyPaths: ['id'] },
                },
            },
        };

        const result = applyPollTriggerPreset(
            trigger,
            'github',
            { owner: 'acme', repo: 'app' },
            'cred-1',
        );

        expect(result.http?.url).toBe('https://api.github.com/repos/acme/app/issues');
        expect(result.http?.credentialId).toBe('cred-1');
        expect(result.connectorTriggerId).toBe('new_issues');
    });

    it('applySubscribeTriggerPreset substitutes subscribe templates', () => {
        const trigger: ConnectorTrigger = {
            triggerId: 'payment_succeeded',
            displayName: 'Payment succeeded',
            triggerType: 'WEBHOOK',
            preset: {
                webhook: {
                    deliveryMode: 'SUBSCRIBE',
                    subscribeHttp: {
                        method: 'POST',
                        url: 'https://api.stripe.com/v1/webhook_endpoints',
                        body: 'url={{callbackUrl}}&enabled_events[]=payment_intent.succeeded',
                    },
                    unsubscribeHttp: {
                        method: 'DELETE',
                        url: 'https://api.stripe.com/v1/webhook_endpoints/{subscriptionId}',
                    },
                    subscriptionIdPath: '$.id',
                },
            },
        };

        const result = applySubscribeTriggerPreset(trigger, 'stripe', { subscriptionId: 'we_123' });

        expect(result.deliveryMode).toBe('SUBSCRIBE');
        expect(result.subscribeHttp?.body).toContain('{{callbackUrl}}');
        expect(result.unsubscribeHttp?.url).toBe(
            'https://api.stripe.com/v1/webhook_endpoints/we_123',
        );
    });
});
