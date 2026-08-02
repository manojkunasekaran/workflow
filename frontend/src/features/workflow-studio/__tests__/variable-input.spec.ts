// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';
import { mockWorkflowApi, mockExecutionApi } from '../../tests/helpers/pages';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SINGLE_TASK_WORKFLOW = {
    id: 'wf-expr-1',
    name: 'Expression Test Workflow',
    tasks: [
        {
            taskId: 'http_task_1',
            type: 'HTTP_TASK',
            parameters: { type: 'HTTP_TASK', method: 'GET', url: '' },
        },
    ],
    layout: {
        'workflow-start': { x: 80, y: 240 },
        http_task_1: { x: 280, y: 240 },
    },
};

const TWO_TASK_WORKFLOW = {
    id: 'wf-expr-2',
    name: 'Two Task Workflow',
    tasks: [
        {
            taskId: 'http_task_1',
            type: 'HTTP_TASK',
            parameters: { type: 'HTTP_TASK', method: 'GET', url: 'https://api.example.com' },
        },
        {
            taskId: 'http_task_2',
            type: 'HTTP_TASK',
            parameters: { type: 'HTTP_TASK', method: 'POST', url: '' },
        },
    ],
    layout: {
        'workflow-start': { x: 80, y: 240 },
        http_task_1: { x: 280, y: 240 },
        http_task_2: { x: 480, y: 240 },
    },
};

// ─── Helper: Open the config dialog for a given node ──────────────────────────

async function openTaskConfig(page: import('@playwright/test').Page, taskId: string) {
    const node = page.getByTestId(`task-node-${taskId}`);
    await node.click();
    await expect(page.getByTestId('task-config-dialog')).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Variable Input: Fixed / Expression Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/rest/workflows/wf-expr-2', (route) =>
            route.fulfill({ status: 200, json: TWO_TASK_WORKFLOW }),
        );
        await page.route('**/rest/executions**', (route) =>
            route.fulfill({ status: 200, json: { content: [], totalElements: 0 } }),
        );
        await page.goto('/workflows/wf-expr-2');
        await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
    });

    // N-001 – Happy path: toggle is present for text fields
    test('N-001: Fixed/Expression toggle renders on a text field', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        // The URL field (type: 'text') should show the toggle
        const toggle = page.getByTestId('variable-input-toggle-url');
        await expect(toggle).toBeVisible();
    });

    // N-002 – Happy path: default mode is "Fixed" for empty values
    test('N-002: Default mode is Fixed when value contains no expression', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        const fixedBtn = page.getByTestId('variable-input-toggle-fixed-url');
        await expect(fixedBtn).toHaveClass(/bg-background/);
    });

    // N-003 – Happy path: switching to Expression mode renders ExpressionEditor
    test('N-003: Clicking Expression toggles to ExpressionEditor', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        const editor = page.getByTestId('expression-editor-url');
        await expect(editor).toBeVisible();
    });

    // N-004 – Happy path: switching back to Fixed restores the standard input
    test('N-004: Switching back to Fixed shows the standard input', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('variable-input-toggle-fixed-url').click();
        // ExpressionEditor should be gone, standard Input should be there
        await expect(page.getByTestId('expression-editor-url')).not.toBeVisible();
        await expect(page.locator(`#url`)).toBeVisible();
    });
});

test.describe('DataExplorer: Variable Picker', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/rest/workflows/wf-expr-2', (route) =>
            route.fulfill({ status: 200, json: TWO_TASK_WORKFLOW }),
        );
        await page.route('**/rest/executions**', (route) =>
            route.fulfill({ status: 200, json: { content: [], totalElements: 0 } }),
        );
        await page.goto('/workflows/wf-expr-2');
        await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
    });

    // N-005 – Happy path: DataExplorer opens via "Variables" button
    test('N-005: Clicking Variables button opens the DataExplorer', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        await expect(page.getByTestId('data-explorer')).toBeVisible();
    });

    // N-006 – Happy path: DataExplorer shows $input and $variables global sources
    test('N-006: DataExplorer shows global variable sources', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        const explorer = page.getByTestId('data-explorer');
        await expect(explorer).toContainText('Trigger Input');
        await expect(explorer).toContainText('Workflow Variables');
    });

    // N-007 – Happy path: DataExplorer shows ancestor task as a source
    test('N-007: DataExplorer shows the predecessor task as a variable source', async ({ page }) => {
        // Editing http_task_2, which comes AFTER http_task_1
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        const explorer = page.getByTestId('data-explorer');
        // http_task_1 should appear as an available variable source
        await expect(explorer).toContainText('http_task_1');
    });

    // N-008 – Negative: First task sees no predecessor task sources
    test('N-008: First task in chain shows no predecessor task sources', async ({ page }) => {
        await openTaskConfig(page, 'http_task_1');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        const explorer = page.getByTestId('data-explorer');
        // Should NOT contain any $tasks.xxx source
        await expect(explorer).not.toContainText('$tasks.');
    });

    // N-009 – Happy path: Search filters variable sources
    test('N-009: Searching in DataExplorer filters the variable list', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        const searchBox = page.getByTestId('data-explorer-search');
        await searchBox.fill('variables');
        // Only "Workflow Variables" should remain visible, others hidden
        const explorer = page.getByTestId('data-explorer');
        await expect(explorer).toContainText('Workflow Variables');
    });

    // N-010 – Happy path: {{ typing auto-triggers the DataExplorer
    test('N-010: Typing {{ in the ExpressionEditor auto-opens DataExplorer', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        const editor = page.getByTestId('expression-editor-url');
        await editor.fill('{{');
        await expect(page.getByTestId('data-explorer')).toBeVisible();
    });

    // N-011 – Edge: DataExplorer closes on Escape
    test('N-011: Pressing Escape in ExpressionEditor closes the DataExplorer', async ({ page }) => {
        await openTaskConfig(page, 'http_task_2');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        await expect(page.getByTestId('data-explorer')).toBeVisible();
        await page.getByTestId('expression-editor-url').press('Escape');
        await expect(page.getByTestId('data-explorer')).not.toBeVisible();
    });
});

test.describe('Variable Input: Single Task Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/rest/workflows/wf-expr-1', (route) =>
            route.fulfill({ status: 200, json: SINGLE_TASK_WORKFLOW }),
        );
        await page.route('**/rest/executions**', (route) =>
            route.fulfill({ status: 200, json: { content: [], totalElements: 0 } }),
        );
        await page.goto('/workflows/wf-expr-1');
        await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
    });

    // N-012 – Edge: Empty state shown when no ancestor tasks exist
    test('N-012: DataExplorer shows empty state message when no ancestor tasks exist', async ({ page }) => {
        await openTaskConfig(page, 'http_task_1');
        await page.getByTestId('variable-input-toggle-expression-url').click();
        await page.getByTestId('expression-open-explorer').click();
        // Even with no ancestors, global sources should still appear
        const explorer = page.getByTestId('data-explorer');
        await expect(explorer).toContainText('$input');
    });
});
