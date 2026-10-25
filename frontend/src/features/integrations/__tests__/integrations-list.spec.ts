import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '@/test-utils/e2e/setupAuthenticatedSession';

const MOCK_ORGANIZATION_CONNECTORS = [
    {
        connectorId: 'sys-1',
        displayName: 'System Integration 1',
        icon: 'SysIcon1',
        category: 'System',
        authType: 'NONE',
        actions: [],
        scope: 'SYSTEM',
        taskType: 'CONNECTOR_TASK',
    },
    {
        connectorId: 'ten-1',
        displayName: 'Custom Connector 1',
        icon: 'TenIcon1',
        category: 'Custom',
        authType: 'NONE',
        actions: [],
        scope: 'ORGANIZATION',
        taskType: 'CONNECTOR_TASK',
    },
];

test.describe('Integrations List', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.route('**/rest/connectors', (route) => {
            route.fulfill({ json: MOCK_ORGANIZATION_CONNECTORS });
        });
        await page.goto('/apps');
    });

    test('should show a unified directory of both system and custom connectors', async ({ page }) => {
        await expect(page.getByTestId('integrations-page-heading')).toBeVisible();
        await expect(page.getByText('System Integration 1')).toBeVisible();
        await expect(page.getByText('Custom Connector 1')).toBeVisible();

        await expect(page.getByText('Official')).toBeVisible();
        await expect(page.getByText('Custom', { exact: true }).first()).toBeVisible();
    });
});
