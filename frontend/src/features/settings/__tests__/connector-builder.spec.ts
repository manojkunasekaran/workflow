import { test, expect, type Page } from '@playwright/test';
import { setupAuthenticatedSession } from '@/test-utils/e2e/setupAuthenticatedSession';

async function mockConnectorRoutes(page: Page) {
    await page.route('**/rest/connectors', async (route) => {
        const method = route.request().method();

        if (method === 'GET') {
            await route.fulfill({ json: [] });
            return;
        }

        if (method === 'POST') {
            const body = route.request().postDataJSON() as Record<string, unknown>;
            const displayName = String(body.displayName ?? 'New App');
            const connectorId = displayName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            await route.fulfill({
                json: {
                    connectorId,
                    displayName,
                    category: body.category ?? 'Custom',
                    icon: body.icon ?? '',
                    baseUrl: body.baseUrl ?? '',
                    authType: body.authType ?? 'NONE',
                    actions: body.actions ?? [],
                    triggers: [],
                    enabled: true,
                    scope: 'ORGANIZATION',
                    taskType: 'CONNECTOR_TASK',
                },
            });
            return;
        }

        await route.continue();
    });

    await page.route('**/rest/connectors/*', async (route) => {
        if (route.request().method() === 'PUT') {
            await route.fulfill({ json: route.request().postDataJSON() });
            return;
        }
        await route.continue();
    });
}

async function openNewAppDialog(page: Page) {
    await mockConnectorRoutes(page);
    await page.goto('/apps/new');
    await expect(page.getByRole('dialog')).toBeVisible();
}

const EXISTING_APP: Record<string, unknown> = {
    connectorId: 'test-api',
    displayName: 'Test API',
    category: 'Custom',
    icon: '',
    baseUrl: 'https://api.test.com',
    authType: 'NONE',
    actions: [],
    triggers: [],
    enabled: true,
    scope: 'ORGANIZATION',
    taskType: 'CONNECTOR_TASK',
};

async function openExistingBuilder(page: Page) {
    await page.route('**/rest/connectors', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({ json: [EXISTING_APP] });
            return;
        }
        if (method === 'PUT') {
            await route.fulfill({ json: route.request().postDataJSON() });
            return;
        }
        await route.continue();
    });
    await page.goto('/apps/test-api');
    await expect(page.getByTestId('connector-builder-heading')).toContainText('Test API');
}

test.describe('Connector Builder UI', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedSession(page);
    });

    test('General Info: Name auto-derives ID, Icon preview', async ({ page }) => {
        await openNewAppDialog(page);

        await page.getByLabel(/^Name/).fill('My Awesome API');
        await expect(page.getByText('id: my-awesome-api')).toBeVisible();

        await page.getByLabel(/Icon URL/).fill('https://cdn.simpleicons.org/slack/E01E5A');
        await expect(page.locator('img[src="https://cdn.simpleicons.org/slack/E01E5A"]')).toBeVisible();
    });

    test('Base Configuration: auth type shows header field for API key mode', async ({ page }) => {
        await openNewAppDialog(page);

        await page.getByLabel(/Base URL/).fill('https://api.awesome.com');
        await page.getByLabel(/Authentication/).click();
        await page.getByRole('option', { name: 'API Key (Custom Header)' }).click();
        await expect(page.getByLabel(/Header name/)).toBeVisible();
    });

    test('Actions: Adding, expanding/collapsing, changing methods, deleting', async ({ page }) => {
        await openExistingBuilder(page);

        await page.getByRole('button', { name: 'Add Action' }).click();

        const actionNameInput = page.getByLabel(/Action Name \*/);
        await expect(actionNameInput).toBeVisible();
        await actionNameInput.fill('Get Users');
        await expect(page.getByText('id: get_users')).toBeVisible();

        const methodSelect = page.getByRole('combobox', { name: 'GET' }).first();
        await methodSelect.click();
        await page.getByRole('option', { name: 'POST' }).click();

        const pathInput = page.getByLabel(/API Path/);
        await pathInput.fill('/users/{userId}');
        await expect(page.getByText('Detected path variables:')).toBeVisible();

        const actionHeader = page.locator('.cursor-pointer').filter({ hasText: 'Get Users' });
        await actionHeader.click();
        await expect(actionNameInput).not.toBeVisible();
        await actionHeader.click();
        await expect(actionNameInput).toBeVisible();

        await page.getByTitle('Remove action').click();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(page.getByText('No actions configured.')).toBeVisible();
    });

    test('Input Schema: Adding parameters, checking types, required toggle', async ({ page }) => {
        await openExistingBuilder(page);

        await page.getByRole('button', { name: 'Add Action' }).click();
        await page.getByRole('button', { name: 'Add Field' }).click();

        const fieldLabelInput = page.getByLabel(/Label \*/);
        await fieldLabelInput.fill('Is Active');
        await expect(page.getByText('key: is_active')).toBeVisible();

        const typeSelect = page.getByRole('combobox').filter({ hasText: 'String' });
        await typeSelect.click();
        await page.getByRole('option', { name: 'Boolean' }).click();
        await expect(page.getByText('supports dynamic expressions')).not.toBeVisible();

        const typeSelectBool = page.getByRole('combobox').filter({ hasText: 'Boolean' });
        await typeSelectBool.click();
        await page.getByRole('option', { name: 'String (Multiline)' }).click();
        await expect(page.getByText('supports dynamic expressions')).toBeVisible();

        const typeSelectTextarea = page.getByRole('combobox').filter({ hasText: 'String (Multiline)' });
        await typeSelectTextarea.click();
        await page.getByRole('option', { name: 'JSON' }).click();

        const requiredToggle = page.locator('label').filter({ hasText: 'Required' }).locator('div').first();
        await requiredToggle.click();

        const placeholderInput = page.getByPlaceholder('Placeholder hint...');
        await placeholderInput.fill('Enter JSON here');
        await expect(placeholderInput).toHaveValue('Enter JSON here');
    });

    test('Saving: Validation blocks create when required fields missing', async ({ page }) => {
        await openNewAppDialog(page);
        await page.getByRole('button', { name: 'Create app' }).click();
        await expect(page.getByText(/name is required/i)).toBeVisible();
        await expect(page.getByText(/base url is required/i)).toBeVisible();
    });
});
