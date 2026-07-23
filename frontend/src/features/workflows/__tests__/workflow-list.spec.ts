// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';

/**
 * Tests for the Workflow List page (/workflows).
 *
 * Strategy: All network calls are intercepted via page.route() so tests
 * run deterministically without a real backend.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_WORKFLOWS = [
  {
    id: 'wf-001',
    name: 'Order Processing',
    tasks: [{ taskId: 't1' }, { taskId: 't2' }],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T12:00:00Z',
  },
  {
    id: 'wf-002',
    name: 'Customer Onboarding',
    tasks: [{ taskId: 't1' }],
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: null,
  },
];

async function mockWorkflowsApi(page: Page, workflows = MOCK_WORKFLOWS) {
  await page.route('**/rest/workflows', (route) => {
    route.fulfill({ json: workflows });
  });
}

async function mockWorkflowsApiError(page: Page) {
  await page.route('**/rest/workflows', (route) => {
    route.fulfill({ status: 500, json: { message: 'Internal Server Error' } });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Workflow List Page', () => {
  test.describe('Happy Path', () => {
    test('[Happy] should display the page heading', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-list-heading')).toBeVisible();
    });

    test('[Happy] should display "New Workflow" button', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('new-workflow-btn-header')).toBeVisible();
    });

    test('[Happy] should display "Refresh" button', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('refresh-workflows-btn')).toBeVisible();
    });

    test('[Happy] should render a row for each workflow returned by the API', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-name-wf-001')).toHaveText('Order Processing');
      await expect(page.getByTestId('workflow-name-wf-002')).toHaveText('Customer Onboarding');
    });

    test('[Happy] should show correct task count for each workflow', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('task-count-wf-001')).toHaveText('2');
      await expect(page.getByTestId('task-count-wf-002')).toHaveText('1');
    });

    test('[Happy] should show a truncated workflow ID in the table', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-id-wf-001')).toHaveText('wf-001…');
    });

    test('[Happy] clicking a workflow row should navigate to the studio', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await page.getByTestId('workflow-row-wf-001').click();
      await expect(page).toHaveURL('/workflows/wf-001');
    });

    test('[Happy] clicking the arrow button should navigate to the studio', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await page.getByTestId('open-workflow-btn-wf-001').click();
      await expect(page).toHaveURL('/workflows/wf-001');
    });

    test('[Happy] clicking "New Workflow" should navigate to /workflows/new', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      await page.getByTestId('new-workflow-btn-header').click();
      await expect(page).toHaveURL('/workflows/new');
    });
  });

  test.describe('Empty State', () => {
    test('[Edge] should show empty state message when no workflows exist', async ({ page }) => {
      await mockWorkflowsApi(page, []);
      await page.goto('/workflows');
      await expect(page.getByTestId('empty-state-container')).toBeVisible();
    });

    test('[Edge] empty state should show a "New Workflow" CTA button', async ({ page }) => {
      await mockWorkflowsApi(page, []);
      await page.goto('/workflows');
      await expect(page.getByTestId('new-workflow-btn-empty')).toBeVisible();
    });

    test('[Edge] empty state CTA should also navigate to /workflows/new', async ({ page }) => {
      await mockWorkflowsApi(page, []);
      await page.goto('/workflows');
      await page.getByTestId('new-workflow-btn-empty').click();
      await expect(page).toHaveURL('/workflows/new');
    });
  });

  test.describe('Error State', () => {
    test('[Negative] should display an error message when the API fails', async ({ page }) => {
      await mockWorkflowsApiError(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-list-error')).toBeVisible();
    });

    test('[Negative] should not render the table when the API fails', async ({ page }) => {
      await mockWorkflowsApiError(page);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-table-container')).not.toBeVisible();
    });

    test('[Negative] Refresh button should retry the API call on error', async ({ page }) => {
      let callCount = 0;
      await page.route('**/rest/workflows', (route) => {
        callCount++;
        if (callCount === 1) {
          route.fulfill({ status: 500, json: { message: 'Error' } });
        } else {
          route.fulfill({ json: MOCK_WORKFLOWS });
        }
      });
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-list-error')).toBeVisible();
      await page.getByTestId('refresh-workflows-btn').click();
      await expect(page.getByTestId('workflow-name-wf-001')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] workflow with null updatedAt should show createdAt instead', async ({ page }) => {
      await mockWorkflowsApi(page);
      await page.goto('/workflows');
      // Customer Onboarding (wf-002) has updatedAt: null — should fall back to createdAt
      await expect(page.getByTestId('updated-at-wf-002')).not.toHaveText('—');
    });

    test('[Edge] workflow with a very long name should not break the layout', async ({ page }) => {
      await mockWorkflowsApi(page, [
        {
          id: 'wf-long',
          name: 'A'.repeat(100),
          tasks: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: null,
        },
      ]);
      await page.goto('/workflows');
      await expect(page.getByTestId('workflow-row-wf-long')).toBeVisible();
    });

    test('[Edge] workflow with zero tasks should show 0 in the task count column', async ({ page }) => {
      await mockWorkflowsApi(page, [
        { id: 'wf-empty', name: 'Empty Workflow', tasks: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: null },
      ]);
      await page.goto('/workflows');
      await expect(page.getByTestId('task-count-wf-empty')).toHaveText('0');
    });
  });
});
