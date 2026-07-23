// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

/**
 * Smoke Tests — verify the app bootstraps and every top-level route renders.
 * These are the first line of defence. If any of these fail, nothing else works.
 *
 * API calls are intentionally NOT mocked here — we expect the dev server to
 * handle graceful error states when the backend is unavailable.
 */

const ROUTES = [
  { path: '/', name: 'Home / Landing', testId: 'overview-heading' },
  { path: '/workflows', name: 'Workflow List', testId: 'workflow-list-heading' },
  { path: '/executions', name: 'Executions List', testId: 'executions-list-heading' },
  { path: '/settings', name: 'Settings', testId: 'settings-page-heading' },
];

test.describe('App Smoke Tests', () => {
  for (const route of ROUTES) {
    test(`[Happy] ${route.name} route (${route.path}) should load without crashing`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByTestId(route.testId)).toBeVisible();
    });
  }

  test('[Happy] navigation between routes should work without a full page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-link-workflows').click();
    await expect(page).toHaveURL('/workflows');
    await page.getByTestId('nav-link-executions').click();
    await expect(page).toHaveURL('/executions');
    await page.getByTestId('nav-link-settings').click();
    await expect(page).toHaveURL('/settings');
  });

  test('[Edge] unknown route should not crash the app', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByTestId('app-layout-main')).toBeVisible();
  });

  test('[Edge] deeply nested unknown route should not crash the app', async ({ page }) => {
    await page.goto('/a/b/c/d/e/f');
    await expect(page.getByTestId('app-layout-main')).toBeVisible();
  });
});
