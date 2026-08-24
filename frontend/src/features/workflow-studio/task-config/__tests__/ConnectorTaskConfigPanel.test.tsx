import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectorTaskConfigPanel } from '../ConnectorTaskConfigPanel';
import { connectorApi } from '@/api/connectorApi';

vi.mock('@/api/connectorApi', () => ({
    connectorApi: {
        list: vi.fn(),
        testAction: vi.fn()
    }
}));

describe('ConnectorTaskConfigPanel', () => {
    const mockManifests = [
        {
            connectorId: 'slack',
            displayName: 'Slack',
            icon: 'slack.png',
            authType: 'BEARER_TOKEN',
            actions: [
                {
                    actionId: 'post_message',
                    displayName: 'Post Message',
                    inputSchema: [
                        { key: 'channel', label: 'Channel', type: 'STRING', required: true, supportsExpression: true },
                        { key: 'is_bot', label: 'As Bot', type: 'BOOLEAN', required: false }
                    ]
                }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(connectorApi.list).mockResolvedValue(mockManifests as any);
    });

    it('renders loading state initially then populates integrations', async () => {
        render(<ConnectorTaskConfigPanel parameters={{}} onChange={vi.fn()} errors={{}} />);
        
        expect(screen.getByText(/loading integrations/i)).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.queryByText(/loading integrations/i)).not.toBeInTheDocument();
        });
        
        // Since no connectorId is passed, it should show the select dropdown
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByText(/Select an integration/i)).toBeInTheDocument();
    });

    it('renders dynamic fields based on selected action schema', async () => {
        const onChange = vi.fn();
        
        render(
            <ConnectorTaskConfigPanel 
                parameters={{ connectorId: 'slack', actionId: 'post_message', inputs: {} }} 
                onChange={onChange} 
                errors={{}} 
            />
        );
        
        await waitFor(() => {
            expect(screen.getByText('Post Message')).toBeInTheDocument();
        });
        
        // String field with expressions allowed
        expect(screen.getByText(/Channel/)).toBeInTheDocument();
        // Boolean field (rendered as a switch)
        expect(screen.getByText(/As Bot/)).toBeInTheDocument();
        
        // Advanced Options should be visible
        expect(screen.getByText(/Advanced Options/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Max Retries/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Retry Delay/i)).toBeInTheDocument();
    });

    it('updates parameters when advanced options are changed', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        
        render(
            <ConnectorTaskConfigPanel 
                parameters={{ connectorId: 'slack', actionId: 'post_message', inputs: {} }} 
                onChange={onChange} 
                errors={{}} 
            />
        );
        
        await waitFor(() => {
            expect(screen.getByLabelText(/Max Retries/i)).toBeInTheDocument();
        });
        
        const maxRetriesInput = screen.getByLabelText(/Max Retries/i);
        await user.type(maxRetriesInput, '5');
        
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 5 }));
    });
});
