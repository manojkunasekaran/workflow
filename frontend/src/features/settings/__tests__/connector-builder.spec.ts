import { test, expect } from '@playwright/test';

test.describe('Connector Builder UI', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/v1/admin/connectors', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [] });
            } else {
                await route.continue();
            }
        });
        await page.route('**/api/v1/connectors', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [] });
            } else {
                await route.continue();
            }
        });

        // Go to Integrations page and click New Connector
        await page.goto('/integrations');
        
        // Handle potential slow loading of list
        const newConnectorBtn = page.getByRole('button', { name: 'New Connector' }).first();
        await newConnectorBtn.waitFor({ state: 'visible' });
        await newConnectorBtn.click();
        
        // Ensure the builder is visible
        await expect(page.getByRole('heading', { name: 'New Connector' })).toBeVisible();
    });

    test('General Info: Name auto-derives ID, Icon preview', async ({ page }) => {
        // Find Display Name input
        const nameInput = page.getByLabel(/Name \*/);
        await nameInput.fill('My Awesome API');

        // Check if ID is auto-derived
        await expect(page.getByText('id: my-awesome-api')).toBeVisible();

        // Check Icon URL behavior
        const iconInput = page.getByLabel(/Icon URL/);
        await iconInput.fill('https://cdn.simpleicons.org/slack/E01E5A');
        
        // The icon img should be visible
        const iconPreview = page.locator('img[src="https://cdn.simpleicons.org/slack/E01E5A"]');
        await expect(iconPreview).toBeVisible();
    });

    test('Base Configuration: Toggling through all Auth Types', async ({ page }) => {
        // Fill required base URL first
        await page.getByLabel(/Base URL/).fill('https://api.awesome.com');

        const authSelect = page.getByRole('combobox').filter({ hasText: 'No Authentication' }); // Initial state

        // NONE (default)
        await expect(page.getByText('This API is public and requires no credentials.')).toBeVisible();

        // Change to API_KEY
        await authSelect.click();
        await page.getByRole('option', { name: 'API Key (Custom Header)' }).click();
        await expect(page.getByText('Authenticates using a secret key sent in a custom header.')).toBeVisible();
        await expect(page.getByLabel(/Header Name/)).toBeVisible();

        // Change to OAUTH2
        const authSelectApiKey = page.getByRole('combobox').filter({ hasText: 'API Key (Custom Header)' });
        await authSelectApiKey.click();
        await page.getByRole('option', { name: 'OAuth 2.0' }).click();
        await expect(page.getByText('Authenticates via secure delegated OAuth 2.0 authorization.')).toBeVisible();

        // Change to BASIC_AUTH
        const authSelectOAuth = page.getByRole('combobox').filter({ hasText: 'OAuth 2.0' });
        await authSelectOAuth.click();
        await page.getByRole('option', { name: 'Basic Auth' }).click();
        await expect(page.getByText('Authenticates using standard HTTP Basic Auth (Base64 encoded credentials).')).toBeVisible();
    });

    test('Actions: Adding, expanding/collapsing, changing methods, deleting', async ({ page }) => {
        const addActionBtn = page.getByRole('button', { name: 'Add Action' });
        await addActionBtn.click();

        // Action is added and expanded
        const actionNameInput = page.getByLabel(/Action Name \*/);
        await expect(actionNameInput).toBeVisible();
        await actionNameInput.fill('Get Users');
        await expect(page.getByText('id: get_users')).toBeVisible();

        // Change Method
        const methodSelect = page.getByRole('combobox', { name: 'GET' }).first();
        await methodSelect.click();
        await page.getByRole('option', { name: 'POST' }).click();
        
        // Path with params
        const pathInput = page.getByLabel(/API Path/);
        await pathInput.fill('/users/{userId}');
        // Verify path param hint
        await expect(page.getByText('Detected path variables:')).toBeVisible();
        await expect(page.getByText('userId', { exact: true }).nth(1)).toBeVisible();

        // Collapse action
        // The header has the method and name
        const actionHeader = page.locator('.cursor-pointer').filter({ hasText: 'Get Users' });
        await actionHeader.click();
        await expect(actionNameInput).not.toBeVisible();

        // Expand again
        await actionHeader.click();
        await expect(actionNameInput).toBeVisible();

        // Delete action
        const deleteBtn = page.getByTitle('Remove action');
        await deleteBtn.click();
        
        // Confirm delete
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        await confirmBtn.click();

        // Verify deleted
        await expect(page.getByText('No actions configured.')).toBeVisible();
    });

    test('Input Schema: Adding parameters, checking types, required toggle', async ({ page }) => {
        // First add an action so we can add inputs
        await page.getByRole('button', { name: 'Add Action' }).click();

        // Inside the action, add a field
        await page.getByRole('button', { name: 'Add Field' }).click();

        const fieldLabelInput = page.getByLabel(/Label \*/);
        await fieldLabelInput.fill('Is Active');
        
        // Derived key
        await expect(page.getByText('key: is_active')).toBeVisible();

        // Change type to Boolean
        const typeSelect = page.getByRole('combobox').filter({ hasText: 'String' });
        await typeSelect.click();
        await page.getByRole('option', { name: 'Boolean' }).click();

        // The 'supports dynamic expressions' should hide since Boolean doesn't support it
        await expect(page.getByText('supports dynamic expressions')).not.toBeVisible();

        // Change type to String (Multiline)
        const typeSelectBool = page.getByRole('combobox').filter({ hasText: 'Boolean' });
        await typeSelectBool.click();
        await page.getByRole('option', { name: 'String (Multiline)' }).click();
        await expect(page.getByText('supports dynamic expressions')).toBeVisible();

        // Change type to JSON
        const typeSelectTextarea = page.getByRole('combobox').filter({ hasText: 'String (Multiline)' });
        await typeSelectTextarea.click();
        await page.getByRole('option', { name: 'JSON' }).click();

        // Toggle Required
        const requiredToggle = page.locator('label').filter({ hasText: 'Required' }).locator('div').first();
        await requiredToggle.click();
        
        // Check placeholder
        const placeholderInput = page.getByPlaceholder('Placeholder hint...');
        await placeholderInput.fill('Enter JSON here');
        await expect(placeholderInput).toHaveValue('Enter JSON here');
    });

    test('Saving: Validation and successful save', async ({ page }) => {
        // Mock save endpoint
        let savedManifest: any = null;
        await page.route('**/api/v1/admin/connectors', async route => {
            if (route.request().method() === 'POST') {
                savedManifest = route.request().postDataJSON();
                await route.fulfill({ status: 200, json: savedManifest });
            } else if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, json: [] });
            } else {
                await route.fallback();
            }
        });

        // Click save without filling -> should show validation errors
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Name is required.')).toBeVisible();
        await expect(page.getByText('Base URL is required.')).toBeVisible();

        // Fill required fields
        await page.getByLabel(/Name \*/).fill('Test API');
        await page.getByLabel(/Base URL/).fill('https://api.test.com');

        // Add action
        await page.getByRole('button', { name: 'Add Action' }).click();
        await page.getByLabel(/Action Name \*/).fill('Do Something');

        // Save
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Saved')).toBeVisible();

        // Wait for routing back to list
        await expect(page.getByText('System Connectors')).toBeVisible();

        // Verify request payload
        expect(savedManifest).toMatchObject({
            displayName: 'Test API',
            baseUrl: 'https://api.test.com',
            connectorId: 'test-api',
            actions: [
                expect.objectContaining({
                    displayName: 'Do Something',
                    actionId: 'do_something',
                })
            ]
        });
    });
});
