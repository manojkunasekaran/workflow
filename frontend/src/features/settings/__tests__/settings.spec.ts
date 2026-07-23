// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

/**
 * Tests for the Settings page (/settings).
 *
 * Settings page is self-contained (theme from localStorage, health from API).
 * API is mocked for deterministic runs.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HEALTH_UP = {
  status: 'UP',
  components: { mongo: { status: 'UP' }, rabbit: { status: 'UP' } },
};

const HEALTH_DOWN = {
  status: 'DOWN',
  components: { mongo: { status: 'DOWN' } },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Settings Page', () => {
  test.describe('Happy Path — Page Load', () => {
    test('[Happy] should display the Settings page heading', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('settings-page-heading')).toBeVisible();
    });

    test('[Happy] should show the Profile Settings section', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('profile-settings-section')).toBeVisible();
    });

    test('[Happy] should show the User Preferences section', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('user-preferences-section')).toBeVisible();
    });

    test('[Happy] should show the System Status section', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('system-status-section')).toBeVisible();
    });
  });

  test.describe('Happy Path — Theme Switcher', () => {
    test('[Happy] should show Light, Dark, and System theme buttons', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('theme-light-btn')).toBeVisible();
      await expect(page.getByTestId('theme-dark-btn')).toBeVisible();
      await expect(page.getByTestId('theme-system-btn')).toBeVisible();
    });

    test('[Happy] clicking the Dark button should apply dark class to html', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await page.getByTestId('theme-dark-btn').click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('[Happy] clicking the Light button should remove dark class from html', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      // First enable dark
      await page.getByTestId('theme-dark-btn').click();
      // Then switch to light
      await page.getByTestId('theme-light-btn').click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('[Happy] theme preference should persist across page navigations', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await page.getByTestId('theme-dark-btn').click();
      // Navigate away and come back
      await page.goto('/workflows');
      await page.route('**/rest/workflows', (route) => route.fulfill({ json: [] }));
      await page.goto('/settings');
      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });

  test.describe('Happy Path — System Status', () => {
    test('[Happy] should show "All Systems Operational" when API health is UP', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('system-status-badge')).toHaveText('All Systems Operational');
    });
  });

  test.describe('Negative Path — System Status', () => {
    test('[Negative] should show degraded status when API health returns DOWN', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_DOWN }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('system-status-badge')).toHaveText(/offline|degraded/i);
    });

    test('[Negative] should show degraded status when health API is unreachable (network error)', async ({ page }) => {
      await page.route('**/actuator/health', (route) => route.abort());
      await page.goto('/settings');
      // Should show degraded/offline, not crash
      await expect(page.getByTestId('system-status-badge')).toHaveText(/offline|degraded/i);
    });
  });

  test.describe('Edge Cases — Profile Form', () => {
    test('[Edge] Full Name input should be editable', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const nameInput = page.getByTestId('full-name-input');
      await nameInput.clear();
      await nameInput.fill('Jane Smith');
      await expect(nameInput).toHaveValue('Jane Smith');
    });

    test('[Edge] Email input should be editable', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const emailInput = page.getByTestId('email-input');
      await emailInput.clear();
      await emailInput.fill('jane@example.com');
      await expect(emailInput).toHaveValue('jane@example.com');
    });

    test('[Edge] "Update Profile" button should be present', async ({ page }) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('update-profile-btn')).toBeVisible();
    });
  });
});
