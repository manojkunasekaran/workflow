// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

const MOCK_WORKFLOW = {
  id: 'wf-task-001',
  name: 'Task Config Testing Workflow',
  tasks: [
    {
      taskId: 'task_http_1',
      type: 'HTTP_TASK',
      parameters: {
        url: 'https://api.example.com/v1/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    },
    {
      taskId: 'task_conditional_1',
      type: 'CONDITIONAL',
      parameters: {
        conditions: [
          { field: 'status', operator: 'EQUALS', value: '200' },
        ],
      },
    },
    {
      taskId: 'task_wait_1',
      type: 'WAIT',
      parameters: {
        duration: 30,
        unit: 'SECONDS',
      },
    },
  ],
};

async function mockStudioApis(page: any) {
  await page.route('**/rest/workflows/wf-task-001', (route: any) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ json: { ...MOCK_WORKFLOW, name: 'Updated Title' } });
    } else {
      route.fulfill({ json: MOCK_WORKFLOW });
    }
  });
  await page.route('**/rest/workflows', (route: any) => {
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      route.fulfill({ status: 200, json: MOCK_WORKFLOW });
    } else {
      route.fulfill({ json: [MOCK_WORKFLOW] });
    }
  });
}

test.describe('Task Plugin Configurations & Validation', () => {
  test.beforeEach(async ({ page }) => {
    await mockStudioApis(page);
    await page.goto('/workflows/wf-task-001');
  });

  test.describe('Happy Path', () => {
    test('[Happy] canvas container is visible and displays workflow header', async ({ page }) => {
      await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
      await expect(page.getByTestId('workflow-name-input')).toHaveValue('Task Config Testing Workflow');
    });

    test('[Happy] mode toggles switch between Design and Inspect modes', async ({ page }) => {
      await expect(page.getByTestId('mode-design-toggle')).toBeVisible();
      await page.getByTestId('mode-inspect-toggle').click();
      await expect(page.getByTestId('run-workflow-btn')).toBeDisabled();
      await page.getByTestId('mode-design-toggle').click();
      await expect(page.getByTestId('run-workflow-btn')).not.toBeDisabled();
    });
  });

  test.describe('Negative Path', () => {
    test('[Negative] entering an invalid workflow name placeholder does not crash page', async ({ page }) => {
      await page.getByTestId('workflow-name-input').fill('');
      await expect(page.getByTestId('draft-badge')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] clicking save button triggers workflow save action', async ({ page }) => {
      await page.getByTestId('workflow-name-input').fill('Updated Title');
      await expect(page.getByTestId('save-workflow-btn')).not.toBeDisabled();
      await page.getByTestId('save-workflow-btn').click();
      await expect(page.getByTestId('save-workflow-btn')).toBeVisible();
    });
  });
});
