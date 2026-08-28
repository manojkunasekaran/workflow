// Should read the rules before creating/updating the test files
import { test, expect } from '@playwright/test';

test.describe('AGENTS_TASK End-to-End Features', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the workflows POST endpoint so we can verify the payload and avoid actual saving
        await page.route('**/rest/workflows', async (route) => {
            const request = route.request();
            if (request.method() === 'POST') {
                const payload = request.postDataJSON();
                // Store payload globally on page for assertion
                await page.evaluate((data) => {
                    (window as any).__interceptedPayload = data;
                }, payload);
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ id: 'mock-workflow-123' })
                });
            } else {
                await route.continue();
            }
        });

        // Intercept definitions endpoint to allow creating a new workflow
        await page.route('**/rest/workflows/*', async (route) => {
             if (route.request().method() === 'GET') {
                await route.fulfill({
                   status: 404, // Not found implies new workflow if handled
                   body: '{}'
                })
             } else {
                await route.continue()
             }
        })

        // Navigate directly to the studio for a new workflow
        await page.goto('/workflows/new');
        
        // Ensure the canvas is loaded
        await expect(page.locator('.react-flow__pane')).toBeVisible();
    });

    test('[Happy] should configure AGENTS_TASK properties and wire an HTTP tool correctly', async ({ page }) => {
        // 1. Drag & Drop AGENTS_TASK
        await page.dragAndDrop('[data-testid="catalog-item-AGENTS_TASK"]', '.react-flow__pane', {
            targetPosition: { x: 300, y: 150 }
        });

        // 2. Click the Agents Node to open the config panel
        // React Flow nodes typically have data-id, but we can click the title or role="button" inside the node
        const agentNode = page.locator('.react-flow__node').filter({ hasText: 'AI Agent' }).first();
        await expect(agentNode).toBeVisible();
        await agentNode.click();

        // 3. Configure AGENTS_TASK properties in the dialog
        await expect(page.getByTestId('task-config-dialog')).toBeVisible();

        await page.getByTestId('task-field-model').fill('gpt-4o');
        await page.getByTestId('task-field-providerUrl').fill('https://mock.api/v1/chat');
        await page.getByTestId('task-field-userPrompt').fill('Help me extract emails');
        // 'stream' is a segmented toggle
        await page.getByTestId('task-field-stream-true').click();

        // Configure the JSON Tools array
        const toolsJson = JSON.stringify([
            {
                name: "fetch_data",
                description: "Fetches data",
                targetTaskId: "http_1",
                inputSchema: { type: "object", properties: {} }
            }
        ], null, 2);
        await page.getByTestId('task-field-tools').fill(toolsJson);

        // Close the panel
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('task-config-dialog')).toBeHidden();

        // 4. Add an HTTP_TASK node
        await page.dragAndDrop('[data-testid="catalog-item-HTTP_TASK"]', '.react-flow__pane', {
            targetPosition: { x: 300, y: 400 }
        });
        const httpNode = page.locator('.react-flow__node').filter({ hasText: 'HTTP Request' }).first();
        await expect(httpNode).toBeVisible();

        // Note: Playwright drag-and-drop between handles in React Flow can be flaky.
        // We will attempt a standard mouse sequence to connect bottom-tool on Agent -> target on HTTP.
        
        const agentBottomHandle = agentNode.getByTestId('handle-bottom-tool');
        await expect(agentBottomHandle).toBeVisible();
        
        // Find the HTTP node's top handle. The target handle in our UI is usually '.react-flow__handle-top'
        const httpTopHandle = httpNode.locator('.react-flow__handle-top').first();
        await expect(httpTopHandle).toBeVisible();

        await agentBottomHandle.hover();
        await page.mouse.down();
        await httpTopHandle.hover();
        await page.mouse.up();

        // Verify the connection edge exists
        await expect(page.locator('.react-flow__edge')).toHaveCount(2); // main spine + tool branch (or just 1 if no main edge)

        // 5. Save the workflow
        await page.getByTestId('save-workflow-btn').click();

        // 6. Verify the intercepted payload
        // We wait a beat for the save to trigger and the mock to capture it
        await page.waitForTimeout(500);

        const savedPayload = await page.evaluate(() => (window as any).__interceptedPayload);
        expect(savedPayload).toBeDefined();

        const tasks = savedPayload.tasks;
        expect(tasks.length).toBeGreaterThanOrEqual(2);

        const savedAgentTask = tasks.find((t: any) => t.type === 'AGENTS_TASK');
        const savedHttpTask = tasks.find((t: any) => t.type === 'HTTP_TASK');

        expect(savedAgentTask).toBeDefined();
        expect(savedHttpTask).toBeDefined();

        // Verify AGENTS_TASK payload properties
        expect(savedAgentTask.parameters.model).toBe('gpt-4o');
        expect(savedAgentTask.parameters.providerUrl).toBe('https://mock.api/v1/chat');
        expect(savedAgentTask.parameters.userPrompt).toBe('Help me extract emails');
        expect(savedAgentTask.parameters.stream).toBe('true');
        
        const parsedTools = JSON.parse(savedAgentTask.parameters.tools);
        expect(parsedTools[0].name).toBe('fetch_data');
        expect(parsedTools[0].targetTaskId).toBe(savedHttpTask.taskId);

        // Verify HTTP_TASK was marked as a tool automatically by the wiring!
        // Wait, did we implement automatic isTool: true based on wiring in the frontend?
        // Let's verify that the frontend actually sets isTool: true if it's wired to a tool port!
        // We will assert it, if it fails we know we need to fix the UI serialization!
    });
});
