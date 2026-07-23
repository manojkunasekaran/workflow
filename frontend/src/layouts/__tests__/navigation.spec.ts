// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

test.describe('App Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Happy Path', () => {
    test('[Happy] B-001: app-layout-main is visible on every route', async ({ page }) => {
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
      await page.goto('/workflows');
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
      await page.goto('/executions');
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
      await page.goto('/settings');
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
    });

    test('[Happy] B-002, B-003, B-004, B-009: sidebar navigation links and brand logo are present', async ({ page }) => {
      await expect(page.getByTestId('nav-logo-link')).toBeVisible();
      await expect(page.getByTestId('nav-link-home')).toBeVisible();
      await expect(page.getByTestId('nav-link-workflows')).toBeVisible();
      await expect(page.getByTestId('nav-link-executions')).toBeVisible();
      await expect(page.getByTestId('nav-link-settings')).toBeVisible();
    });

    test('[Happy] B-005: clicking sidebar Workflows link routes to /workflows', async ({ page }) => {
      await page.getByTestId('nav-link-workflows').click();
      await expect(page).toHaveURL('/workflows');
    });

    test('[Happy] B-006: clicking sidebar Executions link routes to /executions', async ({ page }) => {
      await page.getByTestId('nav-link-executions').click();
      await expect(page).toHaveURL('/executions');
    });

    test('[Happy] B-007: clicking sidebar Settings link routes to /settings', async ({ page }) => {
      await page.getByTestId('nav-link-settings').click();
      await expect(page).toHaveURL('/settings');
    });

    test('[Happy] B-008: clicking collapse button toggles sidebar state', async ({ page }) => {
      await expect(page.getByTestId('sidebar-collapse-btn')).toBeVisible();
      await page.getByTestId('sidebar-collapse-btn').click();
      await expect(page.getByTestId('sidebar-collapse-btn')).toBeVisible();
    });
  });

  test.describe('Negative Path', () => {
    test('[Negative] B-010: unknown route /does-not-exist mounts layout without crashing', async ({ page }) => {
      await page.goto('/does-not-exist');
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] B-011: deeply nested unknown route /a/b/c/d mounts layout without crashing', async ({ page }) => {
      await page.goto('/a/b/c/d');
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
    });

    test('[Edge] B-012: mobile viewport resize maintains main layout visibility', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByTestId('app-layout-main')).toBeVisible();
    });
  });
});
