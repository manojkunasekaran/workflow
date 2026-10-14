// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';

async function openSystemStatusTab(page: Page) {
  await page.getByTestId('settings-tab-system').click();
  await expect(page.getByTestId('system-status-section')).toBeVisible();
}

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

const ORG_APPEARANCE_DEFAULT = {
  accentPresetId: 'default',
  logoUrl: null,
  lockAccent: false,
};

const USER_APPEARANCE_DEFAULT = {
  themeMode: 'system',
  accentPresetId: 'default',
  density: 'comfortable',
  radiusPreset: 'md',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

const MOCK_ORGANIZATIONS = [{ id: 'org-test-1', name: 'Test Organization' }];

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/sign-in-options', (route) =>
      route.fulfill({
        json: {
          mode: 'DEMO',
          signInRequired: true,
          demoAdminSignInAvailable: true,
          demoUserSignInAvailable: true,
          oauthSignInAvailable: false,
        },
      }),
    );
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        json: {
          userId: 'settings-e2e-user',
          displayName: 'Demo Admin',
          email: 'demo-admin@workflow360.local',
          platformAdmin: true,
          signInRequired: true,
          authMode: 'DEMO',
          activeOrganizationId: MOCK_ORGANIZATIONS[0].id,
          organizations: [
            {
              id: MOCK_ORGANIZATIONS[0].id,
              name: MOCK_ORGANIZATIONS[0].name,
              role: 'ORGANIZATION_ADMIN',
            },
          ],
        },
      }),
    );
    await page.route('**/admin/organizations', (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name: string };
        route.fulfill({
          json: { id: 'org-new', name: body.name },
        });
        return;
      }
      route.fulfill({ json: MOCK_ORGANIZATIONS });
    });
    let userAppearance = { ...USER_APPEARANCE_DEFAULT };
    await page.route('**/settings/org-appearance', (route) =>
      route.fulfill({ json: ORG_APPEARANCE_DEFAULT }),
    );
    await page.route('**/users/me/appearance', async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        userAppearance = { ...userAppearance, ...req.postDataJSON() };
        await route.fulfill({ json: userAppearance });
        return;
      }
      await route.fulfill({ json: userAppearance });
    });
  });

  test.describe('Happy Path — Page Load', () => {
    test('[Happy] should display the Settings page heading', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('settings-page-heading')).toBeVisible();
    });

    test('[Happy] should show the Profile Settings section', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('profile-settings-section')).toBeVisible();
    });

    test('[Happy] should show the User Preferences section', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('user-preferences-section')).toBeVisible();
    });

    test('[Happy] should show the System Status section', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await openSystemStatusTab(page);
    });
  });

  test.describe('Happy Path — Theme Switcher', () => {
    test('[Happy] should show Light, Dark, and System theme buttons', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('theme-light-btn')).toBeVisible();
      await expect(page.getByTestId('theme-dark-btn')).toBeVisible();
      await expect(page.getByTestId('theme-system-btn')).toBeVisible();
    });

    test('[Happy] clicking the Dark button should apply dark class to html', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await page.getByTestId('theme-dark-btn').click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('[Happy] clicking the Light button should remove dark class from html', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      // First enable dark
      await page.getByTestId('theme-dark-btn').click();
      // Then switch to light
      await page.getByTestId('theme-light-btn').click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('[Happy] compact density shrinks control height tokens', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const comfortable = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--density-control-h').trim(),
      );
      await page.getByTestId('appearance-density-compact').click();
      await expect(page.locator('html')).toHaveClass(/density-compact/);
      await expect
        .poll(async () =>
          page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--density-control-h').trim(),
          ),
        )
        .not.toBe(comfortable);
    });

    test('[Happy] selecting Blue accent preset updates --primary on html', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const before = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
      );
      await page.getByTestId('appearance-preset-blue').click();
      await expect
        .poll(async () =>
          page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
          ),
        )
        .not.toBe(before);
    });

    test('[Happy] dark mode with accent preset still updates --primary', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await page.getByTestId('theme-dark-btn').click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.getByTestId('appearance-preset-violet').click();
      const primary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
      );
      expect(primary).toMatch(/^26[0-9]\s/);
    });

    test('[Happy] theme preference should persist across page navigations', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
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
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await openSystemStatusTab(page);
      await expect(page.getByTestId('system-status-badge')).toHaveText('All systems operational');
    });
  });

  test.describe('Negative Path — System Status', () => {
    test('[Negative] should show degraded status when API health returns DOWN', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_DOWN }),
      );
      await page.goto('/settings');
      await openSystemStatusTab(page);
      await expect(page.getByTestId('system-status-badge')).toHaveText(/offline|degraded/i);
    });

    test('[Negative] should show degraded status when health API is unreachable (network error)', async ({ page }) => {
      await page.route('**/system/stats', (route) => route.abort());
      await page.goto('/settings');
      await openSystemStatusTab(page);
      await expect(page.getByTestId('system-status-badge')).toHaveText(/offline|degraded/i);
    });
  });

  test.describe('Edge Cases — Profile Form', () => {
    test('[Edge] Full Name input should be editable', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const nameInput = page.getByTestId('full-name-input');
      await nameInput.clear();
      await nameInput.fill('Jane Smith');
      await expect(nameInput).toHaveValue('Jane Smith');
    });

    test('[Edge] Email input should be editable', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      const emailInput = page.getByTestId('email-input');
      await emailInput.clear();
      await emailInput.fill('jane@example.com');
      await expect(emailInput).toHaveValue('jane@example.com');
    });

    test('[Edge] "Update Profile" button should be present', async ({ page }) => {
      await page.route('**/system/stats', (route) =>
        route.fulfill({ json: HEALTH_UP }),
      );
      await page.goto('/settings');
      await expect(page.getByTestId('update-profile-btn')).toBeVisible();
    });
  });
});
