import { test, expect } from '@playwright/test';

// Should read the rules before creating/updating the test files
test.describe('Credentials Dialog conditional rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/rest/credentials**', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, json: [] });
            } else {
                await route.continue();
            }
        });

        await page.route('**/rest/connectors', async (route) => {
            await route.fulfill({ status: 200, json: [] });
        });

        await page.goto('/credentials');
    });

    test('should conditionally render form fields based on auth type', async ({ page }) => {
        await page.getByRole('button', { name: /Add Credential/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.getByRole('button', { name: 'Custom Auth' }).click();
        await page.getByText('Basic Auth', { exact: true }).click();

        await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Token', { exact: true })).toBeHidden();

        await page.getByRole('button', { name: 'Back' }).click();
        await page.getByText('Bearer Token', { exact: true }).click();

        await expect(page.getByLabel('Token', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Username', { exact: true })).toBeHidden();
    });
});
