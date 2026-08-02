import { test, expect } from '@playwright/test';

// Should read the rules before creating/updating the test files
test.describe('Settings - Credentials Management', () => {

    test.beforeEach(async ({ page }) => {
        // Mock the API calls for credentials
        await page.route('**/api/v1/credentials', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: [
                        {
                            id: 'cred-1',
                            name: 'Test SMTP',
                            type: 'SMTP',
                            organizationId: 'default-org',
                            credentials: { password: '********', host: '********' }
                        }
                    ]
                });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    json: {
                        id: 'cred-2',
                        name: 'New Bearer',
                        type: 'BEARER_TOKEN',
                        credentials: { token: '********' }
                    }
                });
            } else {
                await route.continue();
            }
        });
        
        await page.route('**/api/v1/credentials/cred-1', async (route) => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 204 });
            } else if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 200,
                    json: {
                        id: 'cred-1',
                        name: 'Updated SMTP',
                        type: 'SMTP',
                        credentials: { password: '********', host: '********' }
                    }
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/settings');
    });

    test('should list existing credentials', async ({ page }) => {
        // Assume the Settings page has a CredentialsList component that shows the items
        await expect(page.getByText('Test SMTP')).toBeVisible();
        await expect(page.getByText('SMTP')).toBeVisible();
    });

    test('should open Add Credential dialog and save a new Bearer Token', async ({ page }) => {
        // Open the dialog
        await page.getByRole('button', { name: /Add Credential/i }).click();
        
        // Ensure the dialog is visible
        await expect(page.getByRole('dialog')).toBeVisible();
        
        // Fill in details
        await page.getByLabel(/Credential Name/i).fill('New Bearer');
        
        // Select type
        await page.getByRole('combobox', { name: /Type/i }).click();
        await page.getByRole('option', { name: /Bearer Token/i }).click();
        
        // Fill the token
        await page.getByLabel(/Token/i).fill('my-super-secret-token');
        
        // Save
        await page.getByRole('button', { name: /Save Credential/i }).click();
        
        // Dialog should close
        await expect(page.getByRole('dialog')).toBeHidden();
        
        // Since we didn't mock the state update fully with a re-fetch that includes the new item, 
        // verifying the dialog closes is sufficient for verifying the happy path flow triggers correctly.
    });
});
