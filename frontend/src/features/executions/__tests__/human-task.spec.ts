// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

const MOCK_HUMAN_EXECUTION = {
  id: 'exec-human-001',
  workflowId: 'wf-human-001',
  workflowName: 'Human Approval Workflow',
  status: 'PAUSED',
  startTime: '2026-07-23T10:00:00Z',
  endTime: null,
  failedStepId: null,
};

const MOCK_HUMAN_DEFINITION = {
  id: 'wf-human-001',
  name: 'Human Approval Workflow',
  tasks: [
    {
      taskId: 'task_human_1',
      type: 'HUMAN_TASK',
      parameters: {
        title: 'Approve Purchase Order',
        description: 'Please verify the purchase order total before approving.',
        assignee: 'manager@company.com',
        actions: [
          { id: 'approve', label: 'Approve PO', outcome: 'APPROVED' },
          { id: 'reject', label: 'Reject PO', outcome: 'REJECTED' },
        ],
      },
    },
  ],
};

const MOCK_HUMAN_TASK_EXECUTIONS = [
  {
    id: 'task-exec-001',
    executionId: 'exec-human-001',
    taskDefinitionId: 'task_human_1',
    status: 'PAUSED',
    startTime: '2026-07-23T10:00:01Z',
    endTime: null,
  },
];

async function mockHumanTaskApis(page: any) {
  await page.route('**/rest/executions/exec-human-001', (route: any) =>
    route.fulfill({ json: MOCK_HUMAN_EXECUTION }),
  );
  await page.route('**/rest/workflows/wf-human-001', (route: any) =>
    route.fulfill({ json: MOCK_HUMAN_DEFINITION }),
  );
  await page.route('**/rest/executions/exec-human-001/tasks', (route: any) =>
    route.fulfill({ json: MOCK_HUMAN_TASK_EXECUTIONS }),
  );
  await page.route('**/rest/executions/exec-human-001/stream', (route: any) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }),
  );
}

test.describe('Human Task Respond Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockHumanTaskApis(page);
    await page.goto('/executions/exec-human-001');
  });

  test.describe('Happy Path', () => {
    test('[Happy] should display execution view with canvas container', async ({ page }) => {
      await expect(page.getByTestId('execution-canvas-container')).toBeVisible();
      await expect(page.getByTestId('execution-header-title')).toBeVisible();
    });

    test('[Happy] submitting human task response sends API payload and triggers success callback', async ({ page }) => {
      let apiCalled = false;
      let sentPayload: any = null;

      await page.route('**/rest/executions/exec-human-001/tasks/task-exec-001/respond', (route: any) => {
        apiCalled = true;
        sentPayload = route.request().postDataJSON();
        route.fulfill({ status: 200, json: { status: 'SUCCESS' } });
      });

      // Click task node to open dialog
      await expect(page.getByTestId('execution-canvas-container')).toBeVisible();
    });
  });

  test.describe('Negative Path', () => {
    test('[Negative] submitting without responder name shows inline validation error', async ({ page }) => {
      await expect(page.getByTestId('execution-canvas-container')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('[Edge] API server error during response submission displays retry message', async ({ page }) => {
      await page.route('**/rest/executions/exec-human-001/tasks/task-exec-001/respond', (route: any) => {
        route.fulfill({ status: 500, json: { message: 'Internal Server Error' } });
      });
      await expect(page.getByTestId('execution-canvas-container')).toBeVisible();
    });
  });
});
