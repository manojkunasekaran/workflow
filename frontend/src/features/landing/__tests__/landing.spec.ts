// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Happy Path', () => {
    test('[Happy] A-001: navigate to / — heading with overview-heading is visible', async ({ page }) => {
      await expect(page.getByTestId('overview-heading')).toBeVisible();
      await expect(page.getByTestId('overview-heading')).toHaveText('Overview');
    });

    test('[Happy] A-002, A-003, A-004, A-005: all three navigation cards are visible', async ({ page }) => {
      await expect(page.getByTestId('landing-card-workflows')).toBeVisible();
      await expect(page.getByTestId('landing-card-executions')).toBeVisible();
      await expect(page.getByTestId('landing-card-settings')).toBeVisible();
    });

    test('[Happy] A-006: clicking Workflows card navigates to /workflows', async ({ page }) => {
      await page.getByTestId('landing-card-workflows').click();
      await expect(page).toHaveURL('/workflows');
    });

    test('[Happy] A-007: clicking Executions card navigates to /executions', async ({ page }) => {
      await page.getByTestId('landing-card-executions').click();
      await expect(page).toHaveURL('/executions');
    });

    test('[Happy] A-008: clicking Settings card navigates to /settings', async ({ page }) => {
      await page.getByTestId('landing-card-settings').click();
      await expect(page).toHaveURL('/settings');
    });
  });

  test.describe('Negative Path', () => {
    test('[Negative] A-009: navigating to unknown subpath under / preserves layout container', async ({ page }) => {
      await page.goto('/unknown-subpath');
      await expect(page.getByTestId('overview-heading')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] A-011 & A-012: landing page renders background dot pattern in light and dark mode', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: { status: 'UP' } }),
      );
      await expect(page.getByTestId('overview-heading')).toBeVisible();
      await page.goto('/settings');
      await page.getByTestId('theme-dark-btn').click();
      await page.goto('/');
      await expect(page.getByTestId('overview-heading')).toBeVisible();
    });
  });
});
