// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';

/**
 * Tests for the Executions List (/executions) and Execution Detail (/executions/:id).
 *
 * Strategy: All API calls intercepted via page.route() for deterministic runs.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_WORKFLOWS = [
  { id: 'wf-001', name: 'Order Processing', tasks: [] },
];

const MOCK_EXECUTIONS_PAGE = {
  content: [
    {
      id: 'exec-001',
      workflowId: 'wf-001',
      status: 'COMPLETED',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T10:00:05Z',
      taskExecutionSummaries: [
        { taskExecutionId: 'te-001', taskDefinitionId: 'task_http', status: 'COMPLETED' },
      ],
    },
    {
      id: 'exec-002',
      workflowId: 'wf-001',
      status: 'FAILED',
      startTime: '2024-01-16T09:00:00Z',
      endTime: '2024-01-16T09:00:02Z',
      taskExecutionSummaries: [
        { taskExecutionId: 'te-002', taskDefinitionId: 'task_http', status: 'FAILED' },
      ],
    },
    {
      id: 'exec-003',
      workflowId: 'wf-001',
      status: 'RUNNING',
      startTime: '2024-01-17T11:00:00Z',
      endTime: undefined,
      taskExecutionSummaries: [],
    },
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 20,
};

const MOCK_DEFINITION = {
  id: 'wf-001',
  name: 'Order Processing',
  tasks: [
    { taskId: 'task_http', type: 'HTTP_TASK', parameters: { url: 'https://api.example.com', method: 'GET' } },
  ],
};

const MOCK_TASK_EXECUTIONS = [
  {
    id: 'te-001',
    workflowExecutionId: 'exec-001',
    workflowDefinitionId: 'wf-001',
    taskDefinitionId: 'task_http',
    taskType: 'HTTP_TASK',
    status: 'COMPLETED',
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T10:00:05Z',
    executionData: { statusCode: 200, body: { result: 'ok' } },
    errorMessage: null,
  },
];

async function mockExecutionApis(page: Page) {
  await page.route(
    (url) => url.pathname === '/rest/executions',
    (route) => route.fulfill({ json: MOCK_EXECUTIONS_PAGE }),
  );
  await page.route(
    (url) => url.pathname === '/rest/workflows',
    (route) => route.fulfill({ json: MOCK_WORKFLOWS }),
  );
}

async function mockExecutionDetailApis(page: Page, executionId = 'exec-001') {
  await page.route(`**/rest/executions/${executionId}`, (route) =>
    route.fulfill({ json: MOCK_EXECUTIONS_PAGE.content[0] }),
  );
  await page.route(`**/rest/workflows/wf-001`, (route) =>
    route.fulfill({ json: MOCK_DEFINITION }),
  );
  await page.route(`**/rest/executions/${executionId}/tasks`, (route) =>
    route.fulfill({ json: MOCK_TASK_EXECUTIONS }),
  );
  await page.route(`**/rest/executions/${executionId}/stream`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }),
  );
}

// ── Executions List Tests ─────────────────────────────────────────────────────

test.describe('Executions List Page', () => {
  test.describe('Happy Path', () => {
    test('[Happy] should display the page heading', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('executions-list-heading')).toBeVisible();
    });

    test('[Happy] should display a Refresh button', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('refresh-executions-btn')).toBeVisible();
    });

    test('[Happy] should show all three execution rows', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('execution-row-exec-001')).toBeVisible();
      await expect(page.getByTestId('execution-row-exec-002')).toBeVisible();
      await expect(page.getByTestId('execution-row-exec-003')).toBeVisible();
    });

    test('[Happy] should show correct workflow name resolved from workflowId', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('execution-workflow-name-exec-001')).toHaveText('Order Processing');
    });

    test('[Happy] should display COMPLETED status badge', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('execution-status-cell-exec-001')).toBeVisible();
    });

    test('[Happy] should display FAILED status badge', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await expect(page.getByTestId('execution-status-cell-exec-002')).toBeVisible();
    });

    test('[Happy] should display failed step ID in the Failed step column', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      // exec-002 is FAILED and its taskExecutionSummary has task_http as FAILED
      await expect(page.getByTestId('execution-failed-step-exec-002')).toHaveText('task_http');
    });

    test('[Happy] clicking a row should navigate to execution detail', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await page.getByTestId('execution-row-exec-001').click();
      await expect(page).toHaveURL('/executions/exec-001');
    });

    test('[Happy] clicking the arrow button should navigate to execution detail', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      await page.getByTestId('open-execution-link-exec-001').click();
      await expect(page).toHaveURL('/executions/exec-001');
    });
  });

  test.describe('Empty State', () => {
    test('[Edge] should display empty state message when no executions exist', async ({ page }) => {
      await page.route('**/rest/executions*', (route) =>
        route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 } }),
      );
      await page.route('**/rest/workflows', (route) =>
        route.fulfill({ json: [] }),
      );
      await page.goto('/executions');
      await expect(page.getByTestId('executions-empty-state')).toBeVisible();
    });
  });

  test.describe('Error State', () => {
    test('[Negative] should show error message when executions API fails', async ({ page }) => {
      await page.route('**/rest/executions*', (route) =>
        route.fulfill({ status: 500 }),
      );
      await page.route('**/rest/workflows', (route) =>
        route.fulfill({ json: [] }),
      );
      await page.goto('/executions');
      await expect(page.getByTestId('executions-error-banner')).toBeVisible();
    });

    test('[Negative] should not show table when API fails', async ({ page }) => {
      await page.route('**/rest/executions*', (route) =>
        route.fulfill({ status: 500 }),
      );
      await page.route('**/rest/workflows', (route) =>
        route.fulfill({ json: [] }),
      );
      await page.goto('/executions');
      await expect(page.getByTestId('executions-table-container')).not.toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] execution with no endTime should still display a row', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      // exec-003 has no endTime (RUNNING) — verify the row still renders
      await expect(page.getByTestId('execution-row-exec-003')).toBeVisible();
    });

    test('[Edge] RUNNING execution should show em-dash in the failed step column', async ({ page }) => {
      await mockExecutionApis(page);
      await page.goto('/executions');
      // RUNNING execution has no failed steps — should show '—'
      await expect(page.getByTestId('execution-failed-step-exec-003')).toHaveText('—');
    });
  });
});

// ── Execution Detail Tests ────────────────────────────────────────────────────

test.describe('Execution Detail Page', () => {
  test.describe('Happy Path', () => {
    test('[Happy] should render the execution detail page without crashing', async ({ page }) => {
      await mockExecutionDetailApis(page);
      await page.goto('/executions/exec-001');
      await expect(page.getByTestId('execution-header-title')).toBeVisible();
    });

    test('[Happy] should show a refresh button', async ({ page }) => {
      await mockExecutionDetailApis(page);
      await page.goto('/executions/exec-001');
      await expect(page.getByTestId('execution-header-refresh-btn')).toBeVisible();
    });

    test('[Happy] should render the React Flow canvas', async ({ page }) => {
      await mockExecutionDetailApis(page);
      await page.goto('/executions/exec-001');
      await expect(page.getByTestId('execution-canvas-container')).toBeVisible();
    });
  });

  test.describe('Error State', () => {
    test('[Negative] should show an error view when execution is not found (404)', async ({ page }) => {
      await page.route('**/rest/executions/exec-999', (route) =>
        route.fulfill({ status: 404, json: { message: 'Not found' } }),
      );
      await page.route('**/rest/executions/exec-999/stream', (route) =>
        route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }),
      );
      await page.goto('/executions/exec-999');
      await expect(page.getByTestId('execution-error-view')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] navigating to a different execution should reset the selected task', async ({ page }) => {
      await mockExecutionDetailApis(page, 'exec-001');
      await page.goto('/executions/exec-001');
      // Navigate to another execution — selected task dialog should not be open
      await mockExecutionDetailApis(page, 'exec-002');
      await page.goto('/executions/exec-002');
      // Dialog should not be visible
      await expect(page.getByTestId('task-execution-dialog')).not.toBeVisible();
    });
  });
});
