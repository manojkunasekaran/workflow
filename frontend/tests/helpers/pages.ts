// Should read the rules before creating/updating the test files
import { Page } from '@playwright/test';

/**
 * Base Page Object — shared navigation helpers.
 */
export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(path: string) {
    await this.page.goto(path);
  }
}

/**
 * Page Object for the Workflow List page (/workflows).
 */
export class WorkflowsPage extends BasePage {
  readonly url = '/workflows';

  async goto() {
    await this.navigateTo(this.url);
  }

  getCreateButton() {
    return this.page.getByRole('button', { name: /new workflow/i });
  }

  getWorkflowCards() {
    return this.page.locator('[data-testid="workflow-card"]');
  }

  getSearchInput() {
    return this.page.getByPlaceholder(/search/i);
  }
}

/**
 * Page Object for the Workflow Studio (/workflows/:id).
 */
export class StudioPage extends BasePage {
  async goto(workflowId: string) {
    await this.navigateTo(`/workflows/${workflowId}`);
  }

  getCanvas() {
    return this.page.locator('.react-flow');
  }

  getTaskCatalog() {
    return this.page.locator('[data-testid="task-catalog"]');
  }

  getSaveButton() {
    return this.page.getByRole('button', { name: /save/i });
  }

  getUndoButton() {
    return this.page.getByRole('button', { name: /undo/i });
  }
}

/**
 * Page Object for the Executions list page (/executions).
 */
export class ExecutionsPage extends BasePage {
  readonly url = '/executions';

  async goto() {
    await this.navigateTo(this.url);
  }

  getExecutionRows() {
    return this.page.locator('[data-testid="execution-row"]');
  }
}
