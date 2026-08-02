// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for the SMTP_TASK node in Workflow Studio.
 *
 * Strategy:
 *  - All API calls are intercepted via page.route().
 *  - Node interactions use data-testid selectors exclusively.
 *  - No waitForTimeout() calls — all waits use locator assertions.
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const WORKFLOW_WITH_SMTP = {
    id: 'wf-smtp-01',
    name: 'Alert Workflow',
    tasks: [
        {
            taskId: 'smtp_task_1',
            type: 'SMTP_TASK',
            displayName: 'Send Alert Email',
            parameters: {
                type: 'SMTP_TASK',
                smtpHost: 'smtp.gmail.com',
                smtpPort: 587,
                security: 'STARTTLS',
                smtpUsername: 'alerts@myapp.com',
                smtpPassword: '{{$variables.smtpPassword}}',
                fromAddress: 'alerts@myapp.com',
                fromName: 'My App Alerts',
                to: 'admin@myapp.com',
                subject: 'Workflow Alert',
                body: 'Something happened.',
                bodyFormat: 'PLAIN',
            },
        },
    ],
    variables: { smtpPassword: 'secret' },
};

const EMPTY_WORKFLOW = {
    id: 'wf-smtp-02',
    name: 'New Workflow',
    tasks: [],
    variables: {},
};

async function mockStudioApis(page: Page, workflow = WORKFLOW_WITH_SMTP) {
    await page.route(`**/api/workflows/${workflow.id}`, (route) => {
        if (route.request().method() === 'GET') {
            route.fulfill({ json: workflow });
        } else {
            route.fulfill({ json: { ...workflow } });
        }
    });
    await page.route('**/api/executions/**', (route) =>
        route.fulfill({ json: { id: 'exec-1', status: 'COMPLETED', tasks: [] } }),
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('SMTP Task Node — Catalog', () => {
    test('SMTP_TASK appears in the task catalog', async ({ page }) => {
        await mockStudioApis(page, EMPTY_WORKFLOW);
        await page.goto(`/workflows/${EMPTY_WORKFLOW.id}`);

        // Open the task catalog sidebar
        const catalogToggle = page.getByTestId('catalog-toggle').or(
            page.getByRole('button', { name: /task catalog/i })
        );
        await catalogToggle.click();

        // The SMTP node should appear in the list
        await expect(page.getByTestId('catalog-item-SMTP_TASK')).toBeVisible();
    });

    test('SMTP_TASK catalog item shows the correct label', async ({ page }) => {
        await mockStudioApis(page, EMPTY_WORKFLOW);
        await page.goto(`/workflows/${EMPTY_WORKFLOW.id}`);

        const catalogToggle = page.getByRole('button', { name: /task catalog/i });
        await catalogToggle.click();

        await expect(page.getByTestId('catalog-item-SMTP_TASK')).toContainText(/send email/i);
    });

    test('searching "smtp" in the catalog filters to the SMTP node', async ({ page }) => {
        await mockStudioApis(page, EMPTY_WORKFLOW);
        await page.goto(`/workflows/${EMPTY_WORKFLOW.id}`);

        const catalogToggle = page.getByRole('button', { name: /task catalog/i });
        await catalogToggle.click();

        await page.getByTestId('task-catalog-search').fill('smtp');
        await expect(page.getByTestId('catalog-item-SMTP_TASK')).toBeVisible();

        // HTTP_TASK should be filtered out
        await expect(page.getByTestId('catalog-item-HTTP_TASK')).not.toBeVisible();
    });
});

test.describe('SMTP Task Node — Config Dialog', () => {
    test('clicking an existing SMTP node opens the config dialog', async ({ page }) => {
        await mockStudioApis(page);
        await page.goto(`/workflows/${WORKFLOW_WITH_SMTP.id}`);

        // Click the SMTP task node on the canvas
        const smtpNode = page.getByTestId('task-node-smtp_task_1');
        await smtpNode.click();

        // The config dialog should open — check for SMTP-specific fields
        await expect(page.getByTestId('field-smtpHost')).toBeVisible();
        await expect(page.getByTestId('field-to')).toBeVisible();
        await expect(page.getByTestId('field-subject')).toBeVisible();
    });

    test('SMTP config dialog shows persisted values', async ({ page }) => {
        await mockStudioApis(page);
        await page.goto(`/workflows/${WORKFLOW_WITH_SMTP.id}`);

        const smtpNode = page.getByTestId('task-node-smtp_task_1');
        await smtpNode.click();

        // The host value should be pre-filled from the saved definition
        const hostInput = page.getByTestId('field-smtpHost');
        await expect(hostInput).toHaveValue('smtp.gmail.com');

        const toInput = page.getByTestId('field-to');
        await expect(toInput).toHaveValue('admin@myapp.com');
    });

    test('validation errors shown when required fields are empty', async ({ page }) => {
        await mockStudioApis(page, EMPTY_WORKFLOW);
        await page.goto(`/workflows/${EMPTY_WORKFLOW.id}`);

        // Add an SMTP node via catalog click
        const catalogToggle = page.getByRole('button', { name: /task catalog/i });
        await catalogToggle.click();
        await page.getByTestId('catalog-item-SMTP_TASK').click();

        // Try to save without filling required fields
        const saveBtn = page.getByRole('button', { name: /save/i });
        await saveBtn.click();

        // Validation errors should appear
        await expect(page.getByText(/smtp host is required/i)).toBeVisible();
        await expect(page.getByText(/recipient.*required/i)).toBeVisible();
    });

    test('password field placeholder suggests using a variable', async ({ page }) => {
        await mockStudioApis(page);
        await page.goto(`/workflows/${WORKFLOW_WITH_SMTP.id}`);

        const smtpNode = page.getByTestId('task-node-smtp_task_1');
        await smtpNode.click();

        const passwordField = page.getByTestId('field-smtpPassword');
        await expect(passwordField).toHaveAttribute('placeholder', /\{\{/);
    });
});

test.describe('SMTP Task Node — Execution Summary', () => {
    const EXECUTION_WITH_SMTP = {
        id: 'exec-smtp-1',
        status: 'COMPLETED',
        tasks: [
            {
                taskId: 'smtp_task_1',
                type: 'SMTP_TASK',
                status: 'COMPLETED',
                executionData: {
                    taskType: 'SMTP_TASK',
                    to: 'admin@myapp.com',
                    subject: 'Workflow Alert',
                    smtpHost: 'smtp.gmail.com',
                    smtpPort: 587,
                    fromAddress: 'alerts@myapp.com',
                    status: 'SENT',
                    sentAt: '2026-08-02T03:40:00Z',
                },
            },
        ],
    };

    test('execution summary shows SENT status with success styling', async ({ page }) => {
        await page.route('**/api/executions/exec-smtp-1', (route) =>
            route.fulfill({ json: EXECUTION_WITH_SMTP }),
        );
        await page.route('**/api/executions/exec-smtp-1/tasks', (route) =>
            route.fulfill({ json: EXECUTION_WITH_SMTP.tasks }),
        );

        await page.goto('/executions/exec-smtp-1');
        await page.getByTestId('task-step-smtp_task_1').click();

        await expect(page.getByText('SENT')).toBeVisible();
        await expect(page.getByText('admin@myapp.com')).toBeVisible();
        await expect(page.getByText('Workflow Alert')).toBeVisible();
    });

    test('execution summary shows error on failed send', async ({ page }) => {
        const failedExecution = {
            ...EXECUTION_WITH_SMTP,
            status: 'FAILED',
            tasks: [
                {
                    ...EXECUTION_WITH_SMTP.tasks[0],
                    status: 'FAILED',
                    errorMessage: 'Connection refused: smtp.gmail.com:587',
                    executionData: {
                        taskType: 'SMTP_TASK',
                        status: 'FAILED',
                        errorMessage: 'Connection refused: smtp.gmail.com:587',
                    },
                },
            ],
        };

        await page.route('**/api/executions/exec-smtp-1', (route) =>
            route.fulfill({ json: failedExecution }),
        );
        await page.route('**/api/executions/exec-smtp-1/tasks', (route) =>
            route.fulfill({ json: failedExecution.tasks }),
        );

        await page.goto('/executions/exec-smtp-1');
        await page.getByTestId('task-step-smtp_task_1').click();

        await expect(page.getByText(/connection refused/i)).toBeVisible();
    });
});
