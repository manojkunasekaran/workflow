import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiveWebhookTab, createDefaultWebhookConfig } from '../ReceiveWebhookTab';

vi.mock('@/api/webhookTriggerApi', () => ({
    webhookTriggerApi: {
        getWebhookState: vi.fn(),
        getLogs: vi.fn().mockResolvedValue({
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: 10,
        }),
    },
}));

describe('ReceiveWebhookTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders accept incoming events toggle for new workflow', () => {
        render(
            <ReceiveWebhookTab
                workflowId="NEW_WORKFLOW"
                webhook={createDefaultWebhookConfig()}
                onChange={() => {}}
            />,
        );
        expect(screen.getByText('Accept incoming events')).toBeInTheDocument();
        expect(screen.getByText(/Save the workflow to generate your URL/)).toBeInTheDocument();
    });

    it('does not show old webhooks URL pattern', () => {
        render(
            <ReceiveWebhookTab
                workflowId="wf-1"
                webhook={createDefaultWebhookConfig()}
                onChange={() => {}}
            />,
        );
        expect(screen.queryByDisplayValue(/\/webhooks\//)).not.toBeInTheDocument();
    });
});
