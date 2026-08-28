import { test, expect } from '@playwright/test';

// Should read the rules before creating/updating the test files
const MOCK_WORKFLOW = {
  id: 'wf-task-001',
  name: 'Canvas Testing Workflow',
  tasks: [
    {
      taskId: 'task_1',
      type: 'CONNECTOR_TASK',
      parameters: {
        connectorId: 'test-conn',
        actionId: 'a1'
      },
    },
  ],
};

const MOCK_CONNECTOR = {
  connectorId: 'test-conn',
  displayName: 'Test Connector',
  icon: '',
  category: 'Test',
  authType: 'BEARER_TOKEN',
  actions: [
    {
      actionId: 'a1',
      displayName: 'Action 1',
      inputSchema: []
    }
  ],
  connectionSetup: {
      description: 'Test Connector Setup',
      fields: [
          { key: 'token', label: 'API Token', sensitive: true }
      ]
  },
  scope: 'SYSTEM'
};

async function mockStudioApis(page: any) {
  await page.route('**/rest/workflows/wf-task-001', (route: any) => {
    route.fulfill({ json: MOCK_WORKFLOW });
  });
  
  await page.route('**/api/v1/connectors', (route: any) => {
    route.fulfill({ status: 200, json: [MOCK_CONNECTOR] });
  });

  await page.route('**/api/v1/connections?connectorId=test-conn', (route: any) => {
    route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/api/v1/connections', (route: any) => {
    route.fulfill({ status: 200, json: [] });
  });
}

test.describe('Workflow Canvas Credentials', () => {
  test.beforeEach(async ({ page }) => {
    await mockStudioApis(page);
    await page.goto('/workflows/wf-task-001');
  });

  test('should open add connection dialog scoped to the connector', async ({ page }) => {
    // Click the node on the canvas to open the task config panel
    await page.getByText('Test Connector').click();

    // Verify task config panel is open by looking for the Connection label
    await expect(page.getByText('Connection', { exact: false })).toBeVisible();

    // Click the "New" button in the ConnectionSelectField
    await page.getByRole('button', { name: 'New' }).click();

    // Verify the ConnectorConnectionPanel (dialog) pops up
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add Connection')).toBeVisible();

    // Verify it is scoped correctly to that connector (Test Connector Setup description)
    await expect(dialog.getByText('Test Connector Setup')).toBeVisible();
    await expect(dialog.getByLabel('API Token')).toBeVisible();
  });
});
