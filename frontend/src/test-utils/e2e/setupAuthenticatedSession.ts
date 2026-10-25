import type { Page } from '@playwright/test';

/** Default organization fixture for E2E API mocks. */
export const E2E_DEFAULT_ORGANIZATION = { id: 'org-e2e-1', name: 'E2E Organization' };

const authenticatedSessionFixture = {
  userId: 'e2e-user-id',
  email: 'e2e-user@workflow.local',
  displayName: 'E2E User',
  platformAdmin: true,
  signInRequired: true,
  authMode: 'DEMO' as const,
  activeOrganizationId: E2E_DEFAULT_ORGANIZATION.id,
  organizations: [
    {
      id: E2E_DEFAULT_ORGANIZATION.id,
      name: E2E_DEFAULT_ORGANIZATION.name,
      role: 'ORGANIZATION_ADMIN',
    },
  ],
};

/**
 * Mocks auth session and organization-scoped API routes so Playwright tests run without a real backend login.
 */
export async function setupAuthenticatedSession(page: Page): Promise<void> {
  await page.route('**/auth/sign-in-options', async (route) => {
    await route.fulfill({
      json: {
        mode: 'DEMO',
        signInRequired: true,
        demoAdminSignInAvailable: true,
        demoUserSignInAvailable: true,
        oauthSignInAvailable: false,
      },
    });
  });

  await page.route('**/auth/me', async (route) => {
    await route.fulfill({ json: authenticatedSessionFixture });
  });

  await page.route('**/admin/organizations', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name?: string };
      await route.fulfill({
        json: { id: 'org-e2e-new', name: body.name ?? 'New Organization' },
      });
      return;
    }
    await route.fulfill({ json: [E2E_DEFAULT_ORGANIZATION] });
  });

  await page.route('**/users/me/appearance', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        json: {
          themeMode: 'system',
          accentPresetId: 'default',
          density: 'comfortable',
          radiusPreset: 'md',
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        themeMode: 'system',
        accentPresetId: 'default',
        density: 'comfortable',
        radiusPreset: 'md',
      },
    });
  });

  await page.route('**/settings/org-appearance', (route) =>
    route.fulfill({
      json: { accentPresetId: 'default', logoUrl: null, lockAccent: false },
    }),
  );
}
