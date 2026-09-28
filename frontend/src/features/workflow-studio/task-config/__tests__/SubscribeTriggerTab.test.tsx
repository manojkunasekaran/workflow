import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscribeTriggerTab, createDefaultSubscribeWebhookConfig } from '../SubscribeTriggerTab';

vi.mock('@/api/subscribeTriggerApi', () => ({
    subscribeTriggerApi: {
        getState: vi.fn(),
        getLogs: vi.fn().mockResolvedValue({
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: 10,
        }),
        testSubscribe: vi.fn(),
    },
}));

vi.mock('@/api/connectorApi', () => ({
    connectorApi: {
        list: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('@/features/workflow-studio/task-config/TaskFieldRenderer', () => ({
    TaskFieldRenderer: ({ field }: { field: { label: string } }) => (
        <div data-testid={`field-${field.label}`}>{field.label}</div>
    ),
}));

describe('SubscribeTriggerTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders wizard steps for new workflow', () => {
        render(
            <SubscribeTriggerTab
                workflowId="NEW_WORKFLOW"
                webhook={createDefaultSubscribeWebhookConfig()}
                onChange={() => {}}
            />,
        );
        expect(screen.getByText('1. What to watch')).toBeInTheDocument();
        expect(screen.getByText(/We'll register automatically/)).toBeInTheDocument();
        expect(screen.getByText('Test registration')).toBeInTheDocument();
    });
});
