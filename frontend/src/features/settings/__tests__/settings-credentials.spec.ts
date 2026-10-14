import { test, expect } from '@playwright/test';

// Should read the rules before creating/updating the test files
test.describe('Settings - Credentials Management', () => {

    test.beforeEach(async ({ page }) => {
        await page.route('**/rest/credentials**', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: [
                        {
                            id: 'cred-1',
                            name: 'Test SMTP',
                            type: 'SMTP',
                            organizationId: 'default-org',
                            credentials: { password: '********', host: '********' },
                        },
                    ],
                });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    json: {
                        id: 'cred-2',
                        name: 'New Bearer',
                        type: 'BEARER_TOKEN',
                        credentials: { token: '********' },
                    },
                });
            } else {
                await route.continue();
            }
        });

        await page.route('**/rest/credentials/cred-1', async (route) => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 204 });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 200,
                    json: {
                        id: 'cred-1',
                        name: 'Updated SMTP',
                        type: 'SMTP',
                        credentials: { password: '********', host: '********' },
                    },
                });
            } else {
                await route.continue();
            }
        });

        await page.route('**/rest/connectors', async (route) => {
            await route.fulfill({ status: 200, json: [] });
        });

        await page.goto('/credentials');
    });

    test('should list existing credentials', async ({ page }) => {
        await expect(page.getByRole('cell', { name: 'Test SMTP' })).toBeVisible();
    });

    test('should open Add Credential dialog and save a new Bearer Token', async ({ page }) => {
        await page.getByRole('button', { name: /Add Credential/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.getByRole('button', { name: 'Custom Auth' }).click();
        await page.getByText('Bearer Token', { exact: true }).click();

        await page.getByLabel('Credential Name').fill('New Bearer');
        await page.getByLabel('Token', { exact: true }).fill('my-super-secret-token');
        await page.getByRole('button', { name: /^Save$/i }).click();

        await expect(page.getByRole('cell', { name: 'New Bearer' })).toBeVisible();
    });
});
