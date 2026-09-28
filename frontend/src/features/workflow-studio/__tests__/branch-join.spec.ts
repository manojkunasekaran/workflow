// Should read the rules before creating/updating the test files
import { test, expect, type Page } from '@playwright/test';
import type { WorkflowDefinition } from '@/types/api';

/**
 * BRANCH / JOIN E2E — save + reload round-trip for converge wiring.
 *
 * Fixtures mirror test-fixtures/workflow-topology/*.json (flat + nested single JOIN).
 * API calls are intercepted; persisted state lives in-memory for reload checks.
 */

const HTTP_PARAMS = {
    type: 'HTTP_TASK',
    method: 'GET',
    url: 'https://example.com',
};

const FLAT_BRANCH_JOIN: WorkflowDefinition = {
    id: 'wf-flat-branch-join',
    name: 'flat-branch-join',
    tasks: [
        {
            taskId: 'branch_split',
            type: 'BRANCH',
            parameters: {
                type: 'BRANCH',
                branches: [
                    { branchName: 'Left', startTaskId: 'task_left' },
                    { branchName: 'Right', startTaskId: 'task_right' },
                ],
            },
        },
        { taskId: 'task_left', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        { taskId: 'task_right', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        {
            taskId: 'join_merge',
            type: 'JOIN',
            parameters: {
                type: 'JOIN',
                inboundTaskIds: ['task_left', 'task_right'],
                waitPolicy: 'ALL',
                mergeMode: 'PASS_THROUGH',
                nextTaskId: 'task_after',
            },
        },
        { taskId: 'task_after', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
    ],
};

const NESTED_BRANCH_JOIN: WorkflowDefinition = {
    id: 'wf-nested-branch-join',
    name: 'nested-branch-single-join',
    tasks: [
        {
            taskId: 'branch_outer',
            type: 'BRANCH',
            parameters: {
                type: 'BRANCH',
                branches: [
                    { branchName: 'Path A', startTaskId: 'A' },
                    { branchName: 'Path Inner', startTaskId: 'branch_inner' },
                    { branchName: 'Path E', startTaskId: 'E' },
                ],
            },
        },
        {
            taskId: 'branch_inner',
            type: 'BRANCH',
            parameters: {
                type: 'BRANCH',
                branches: [
                    { branchName: 'Path C', startTaskId: 'C' },
                    { branchName: 'Path D', startTaskId: 'D' },
                ],
            },
        },
        { taskId: 'A', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        { taskId: 'C', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        { taskId: 'D', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        { taskId: 'E', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
        {
            taskId: 'join_shared',
            type: 'JOIN',
            parameters: {
                type: 'JOIN',
                inboundTaskIds: ['A', 'C', 'D', 'E'],
                waitPolicy: 'ALL',
                mergeMode: 'PASS_THROUGH',
                nextTaskId: 'NextStep',
            },
        },
        { taskId: 'NextStep', type: 'HTTP_TASK', parameters: HTTP_PARAMS },
    ],
};

type PersistedApi = {
    get: () => WorkflowDefinition;
    set: (definition: WorkflowDefinition) => void;
};

function createPersistedApi(initial: WorkflowDefinition): PersistedApi {
    let stored = { ...initial };
    return {
        get: () => stored,
        set: (definition) => {
            stored = { ...definition, id: initial.id };
        },
    };
}

async function mockStudioRoutes(page: Page, api: PersistedApi) {
    const workflowId = api.get().id!;

    await page.route(`**/rest/workflows/${workflowId}`, async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({ status: 200, json: api.get() });
            return;
        }
        if (method === 'PUT') {
            const body = route.request().postDataJSON() as WorkflowDefinition;
            api.set(body);
            await route.fulfill({ status: 200, json: api.get() });
            return;
        }
        await route.continue();
    });

    await page.route('**/rest/executions**', (route) =>
        route.fulfill({ status: 200, json: { content: [], totalElements: 0 } }),
    );
}

async function countJoinConvergeEdges(page: Page, joinTaskId: string): Promise<number> {
    const selector = `.react-flow__edge[data-id^="route:"][data-id$="->${joinTaskId}"]`;
    return page.locator(selector).count();
}

async function expectJoinConvergeEdges(page: Page, joinTaskId: string, expected: number) {
    await expect(page.locator('.react-flow__pane')).toBeVisible();
    await expect.poll(() => countJoinConvergeEdges(page, joinTaskId)).toBe(expected);
}

function joinInboundIds(definition: WorkflowDefinition, joinTaskId: string): string[] {
    const joinTask = definition.tasks.find((task) => task.taskId === joinTaskId);
    const raw = joinTask?.parameters?.inboundTaskIds;
    return Array.isArray(raw) ? raw.map((id) => String(id)) : [];
}

async function saveAndReload(page: Page, workflowId: string) {
    await page.getByTestId('workflow-name-input').fill(`${workflowId} saved`);
    await expect(page.getByTestId('save-workflow-btn')).toBeEnabled();
    await page.getByTestId('save-workflow-btn').click();
    await expect(page.getByText('Workflow saved')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('studio-canvas-container')).toBeVisible();
}

test.describe('BRANCH / JOIN — flat converge', () => {
    test('flat BRANCH → JOIN: save, reload, 2 converge edges + inboundTaskIds', async ({ page }) => {
        const api = createPersistedApi(FLAT_BRANCH_JOIN);
        await mockStudioRoutes(page, api);

        await page.goto(`/workflows/${FLAT_BRANCH_JOIN.id}`);
        await expectJoinConvergeEdges(page, 'join_merge', 2);
        expect(joinInboundIds(api.get(), 'join_merge').sort()).toEqual(['task_left', 'task_right']);

        await saveAndReload(page, FLAT_BRANCH_JOIN.id!);
        await expectJoinConvergeEdges(page, 'join_merge', 2);
        expect(joinInboundIds(api.get(), 'join_merge').sort()).toEqual(['task_left', 'task_right']);
    });
});

test.describe('BRANCH / JOIN — nested converge', () => {
    test('nested BRANCH → single JOIN: save, reload, 4 converge edges', async ({ page }) => {
        const api = createPersistedApi(NESTED_BRANCH_JOIN);
        await mockStudioRoutes(page, api);

        await page.goto(`/workflows/${NESTED_BRANCH_JOIN.id}`);
        await expectJoinConvergeEdges(page, 'join_shared', 4);
        expect(joinInboundIds(api.get(), 'join_shared').sort()).toEqual(['A', 'C', 'D', 'E']);

        await saveAndReload(page, NESTED_BRANCH_JOIN.id!);
        await expectJoinConvergeEdges(page, 'join_shared', 4);
        expect(joinInboundIds(api.get(), 'join_shared').sort()).toEqual(['A', 'C', 'D', 'E']);
    });
});
