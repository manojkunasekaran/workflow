import { test, expect } from '@playwright/test';

// Should read the rules before creating/updating the test files
test.describe('Credentials Dialog conditional rendering', () => {
    test.beforeEach(async ({ page }) => {
        // Mock credentials list
        await page.route('**/api/v1/credentials', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, json: [] });
            } else {
                await route.continue();
            }
        });

        // Mock connectors list
        await page.route('**/api/v1/connectors', async (route) => {
            await route.fulfill({ status: 200, json: [] });
        });

        await page.goto('/credentials');
    });

    test('should conditionally render form fields based on auth type', async ({ page }) => {
        await page.getByRole('button', { name: /Add Credential/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        const typeCombobox = page.getByRole('combobox', { name: /Type/i });

        // Select Basic Auth
        await typeCombobox.click();
        await page.getByRole('option', { name: /Basic Auth/i }).click();
        
        await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Token', { exact: true })).toBeHidden();
        await expect(page.getByLabel('SMTP Host', { exact: true })).toBeHidden();

        // Select Bearer Token
        await typeCombobox.click();
        await page.getByRole('option', { name: /Bearer Token/i }).click();

        await expect(page.getByLabel('Token', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Username', { exact: true })).toBeHidden();
        await expect(page.getByLabel('Password', { exact: true })).toBeHidden();

        // Select SMTP
        await typeCombobox.click();
        await page.getByRole('option', { name: /SMTP Server/i }).click();

        await expect(page.getByLabel('SMTP Host', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Port', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Token', { exact: true })).toBeHidden();
    });
});
