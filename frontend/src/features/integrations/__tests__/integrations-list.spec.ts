import { test, expect } from '@playwright/test';

const MOCK_TENANT_CONNECTORS = [
    {
        connectorId: 'sys-1',
        displayName: 'System Integration 1',
        icon: 'SysIcon1',
        category: 'System',
        authType: 'NONE',
        actions: [],
        scope: 'SYSTEM'
    },
    {
        connectorId: 'ten-1',
        displayName: 'Custom Connector 1',
        icon: 'TenIcon1',
        category: 'Custom',
        authType: 'NONE',
        actions: [],
        scope: 'TENANT'
    }
];

test.describe('Integrations List', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/v1/connectors', (route) => {
            route.fulfill({ json: MOCK_TENANT_CONNECTORS });
        });
        await page.goto('/integrations');
    });

    test('should show a unified directory of both system and custom connectors', async ({ page }) => {
        await expect(page.getByTestId('integrations-page-heading')).toBeVisible();
        await expect(page.getByText('System Integration 1')).toBeVisible();
        await expect(page.getByText('Custom Connector 1')).toBeVisible();
        
        // Verify Badges
        await expect(page.getByText('Official')).toBeVisible();
        await expect(page.getByText('Custom', { exact: true })).toBeVisible();
    });
});
