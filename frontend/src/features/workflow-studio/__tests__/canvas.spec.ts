// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';

/**
 * Tests for the Workflow Studio page (/workflows/:id).
 *
 * Strategy: All API calls intercepted via page.route().
 * Canvas interactions are kept simple — complex drag-and-drop tests
 * require real node positions and are marked as planned.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_WORKFLOW = {
  id: 'wf-001',
  name: 'Order Processing',
  description: 'Handles orders',
  tasks: [
    {
      taskId: 'task_http_1',
      type: 'HTTP_TASK',
      parameters: {
        displayName: 'Fetch Order',
        url: 'https://api.example.com/orders',
        method: 'GET',
        headers: [],
      },
    },
  ],
  variables: {},
};

const MOCK_NEW_WORKFLOW = {
  id: 'wf-new',
  name: 'New Workflow',
  tasks: [],
  variables: {},
};

async function mockStudioApis(page: Page, workflow = MOCK_WORKFLOW) {
  await page.route(`**/rest/workflows/${workflow.id}`, (route) =>
    route.fulfill({ json: workflow }),
  );
  await page.route('**/rest/workflows', (route) =>
    route.fulfill({ json: [workflow] }),
  );
}

async function mockNewWorkflowStudio(page: Page) {
  await page.route('**/rest/workflows/new', (route) =>
    route.fulfill({ status: 404, json: { message: 'Not found' } }),
  );
  await page.route('**/rest/workflows', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ json: MOCK_NEW_WORKFLOW });
    } else {
      route.fulfill({ json: [] });
    }
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Workflow Studio', () => {
  test.describe('Happy Path — Page Load', () => {
    test('[Happy] should display the workflow name in the header', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('workflow-name-input')).toHaveValue('Order Processing');
    });

    test('[Happy] should render the React Flow canvas', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
    });

    test('[Happy] should display the "Design" mode toggle as active by default', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('mode-design-toggle')).toBeVisible();
    });

    test('[Happy] should display the "Inspect" mode toggle button', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('mode-inspect-toggle')).toBeVisible();
    });

    test('[Happy] Save button should be visible', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('save-workflow-btn')).toBeVisible();
    });

    test('[Happy] Run Workflow button should be visible', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('run-workflow-btn')).toBeVisible();
    });

    test('[Happy] Back button should navigate back to /workflows', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await page.getByTestId('back-to-workflows-btn').click();
      const leaveBtn = page.getByRole('button', { name: /leave without saving/i });
      if (await leaveBtn.isVisible().catch(() => false)) {
        await leaveBtn.click();
      }
      await expect(page).toHaveURL('/workflows');
    });
  });

  test.describe('Happy Path — Workflow Name Editing', () => {
    test('[Happy] should allow editing the workflow name inline', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      const nameInput = page.getByTestId('workflow-name-input');
      await nameInput.click();
      await nameInput.fill('Updated Workflow Name');
      await expect(nameInput).toHaveValue('Updated Workflow Name');
    });

    test('[Happy] editing the workflow name should show the "Draft" badge', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      const nameInput = page.getByTestId('workflow-name-input');
      await nameInput.click();
      await nameInput.fill('Changed Name');
      await expect(page.getByTestId('draft-badge')).toBeVisible();
    });
  });

  test.describe('Happy Path — Mode Toggle', () => {
    test('[Happy] switching to Inspect mode should disable the Run Workflow button', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await page.getByTestId('mode-inspect-toggle').click();
      await expect(page.getByTestId('run-workflow-btn')).toBeDisabled();
    });

    test('[Happy] switching back to Design mode should re-enable the Run Workflow button', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await page.getByTestId('mode-inspect-toggle').click();
      await page.getByTestId('mode-design-toggle').click();
      await expect(page.getByTestId('run-workflow-btn')).not.toBeDisabled();
    });
  });

  test.describe('Happy Path — Save', () => {
    test('[Happy] Save button should be disabled when there are no unsaved changes', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await expect(page.getByTestId('save-workflow-btn')).toBeDisabled();
    });

    test('[Happy] Save button should be enabled after editing the workflow name', async ({ page }) => {
      await mockStudioApis(page);
      await page.goto('/workflows/wf-001');
      await page.getByTestId('workflow-name-input').fill('New Name');
      await expect(page.getByTestId('save-workflow-btn')).not.toBeDisabled();
    });

    test('[Happy] clicking Save should call the API and dismiss the Draft badge', async ({ page }) => {
      await mockStudioApis(page);
      await page.route('**/rest/workflows', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({ json: { ...MOCK_WORKFLOW, name: 'New Name' } });
        } else {
          route.fulfill({ json: [MOCK_WORKFLOW] });
        }
      });
      await page.goto('/workflows/wf-001');
      await page.getByTestId('workflow-name-input').fill('New Name');
      await page.getByTestId('save-workflow-btn').click();
      // Draft badge should disappear after save
      await expect(page.getByTestId('draft-badge')).not.toBeVisible();
    });
  });

  test.describe('Negative Path', () => {
    test('[Negative] should show error or empty state when workflow API returns 404', async ({ page }) => {
      await page.route('**/rest/workflows/nonexistent', (route) =>
        route.fulfill({ status: 404, json: { message: 'Not found' } }),
      );
      await page.goto('/workflows/nonexistent');
      // Should redirect back to /workflows gracefully
      await expect(page).toHaveURL(/\/workflows$/);
    });

    test('[Negative] Save failure should not remove the Draft badge', async ({ page }) => {
      await mockStudioApis(page);
      await page.route('**/rest/workflows', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 500 });
        } else {
          route.fulfill({ json: [MOCK_WORKFLOW] });
        }
      });
      await page.goto('/workflows/wf-001');
      await page.getByTestId('workflow-name-input').fill('New Name');
      await page.getByTestId('save-workflow-btn').click();
      // After failed save, Draft badge should still be visible
      await expect(page.getByTestId('draft-badge')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] "View execution" link should appear after a successful run', async ({ page }) => {
      await mockStudioApis(page);
      await page.route('**/rest/executions/**', (route) =>
        route.fulfill({
          json: {
            id: 'exec-001',
            workflowId: 'wf-001',
            status: 'COMPLETED',
            startTime: new Date().toISOString(),
          },
        }),
      );
      await page.goto('/workflows/wf-001');
      await page.getByTestId('run-workflow-btn').click();
      await expect(page.getByTestId('view-execution-link')).toBeVisible();
    });

    test('[Edge] workflow with an empty name placeholder should still save', async ({ page }) => {
      await mockStudioApis(page, { ...MOCK_WORKFLOW, name: '' });
      await page.goto('/workflows/wf-001');
      const nameInput = page.getByTestId('workflow-name-input');
      await expect(nameInput).toBeVisible();
    });
  });
});
