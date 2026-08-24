import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectorTestPanel } from '../ConnectorTestPanel';
import { connectorApi } from '@/api/connectorApi';

vi.mock('@/api/connectorApi', () => ({
    connectorApi: {
        testAction: vi.fn()
    }
}));

describe('ConnectorTestPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires two clicks to execute the test (disclaimer safety guard)', async () => {
        const user = userEvent.setup();
        
        render(<ConnectorTestPanel connectorId="slack" actionId="post_message" inputs={{ channel: '123' }} />);
        
        const button = screen.getByRole('button', { name: /test action/i });
        
        // Click 1: Should show disclaimer
        await user.click(button);
        
        // API should NOT be called yet
        expect(connectorApi.testAction).not.toHaveBeenCalled();
        
        // Disclaimer should be visible
        expect(screen.getByText(/DISCLAIMER: This will execute a live API call/i)).toBeInTheDocument();
        
        // Button text changes
        expect(screen.getByRole('button', { name: /run test \(real api call\)/i })).toBeInTheDocument();
        
        // Mock successful API response
        vi.mocked(connectorApi.testAction).mockResolvedValueOnce({
            success: true,
            statusCode: 200,
            durationMs: 45,
            response: { ok: true }
        });
        
        // Click 2: Should execute API
        await user.click(screen.getByRole('button', { name: /run test/i }));
        
        expect(connectorApi.testAction).toHaveBeenCalledWith('slack', {
            actionId: 'post_message',
            credentialId: undefined,
            inputs: { channel: '123' }
        });
        
        // Verify success UI
        await waitFor(() => {
            expect(screen.getByText('Success')).toBeInTheDocument();
            expect(screen.getByText('45ms')).toBeInTheDocument();
            // JSON node tree should render the "ok" property
            expect(screen.getByText('ok:')).toBeInTheDocument();
        });
    });

    it('displays error states correctly when API fails', async () => {
        const user = userEvent.setup();
        
        render(<ConnectorTestPanel connectorId="slack" actionId="post_message" inputs={{}} />);
        
        const button = screen.getByRole('button', { name: /test action/i });
        
        // Bypass disclaimer
        await user.click(button);
        
        vi.mocked(connectorApi.testAction).mockResolvedValueOnce({
            success: false,
            statusCode: 400,
            durationMs: 12,
            error: 'HTTP 400: Bad Request',
            response: { error: 'invalid_auth' }
        });
        
        await user.click(screen.getByRole('button', { name: /run test/i }));
        
        await waitFor(() => {
            expect(screen.getByText('Failed')).toBeInTheDocument();
            expect(screen.getByText('HTTP 400: Bad Request')).toBeInTheDocument();
            expect(screen.getByText('invalid_auth')).toBeInTheDocument();
        });
    });
});
