# Playwright testid Migration Plan & Checklist

This document tracks the step-by-step migration of all frontend component locators and Playwright E2E spec files to use **`data-testid`** attributes exclusively.

---

## Migration Steps Checklist

- [x] **Step 1: Update Mandatory Testing Rules**
  - Updated `AGENTS.md` rule to mandate `data-testid` locators for all Playwright E2E tests.
  - Updated `frontend/tests/rules.md` rule 2 to specify `data-testid` usage exclusively.

- [x] **Step 2: Refactor Settings Feature**
  - Update `src/features/settings/SettingsPage.tsx` with `data-testid` attributes (`settings-page-heading`, `profile-settings-section`, `user-preferences-section`, `system-status-section`, `theme-light-btn`, `theme-dark-btn`, `theme-system-btn`, `status-badge`, `full-name-input`, `email-input`, `update-profile-btn`).
  - Refactor `src/features/settings/__tests__/settings.spec.ts` to use `getByTestId(...)` exclusively.
  - Verify feature tests pass.

- [x] **Step 3: Refactor Workflow List Feature**
  - Update `src/features/workflows/WorkflowListPage.tsx` with `data-testid` attributes (`workflow-list-heading`, `new-workflow-btn-header`, `refresh-workflows-btn`, `workflow-row-{id}`, `workflow-name-{id}`, `task-count-{id}`, `workflow-id-{id}`, `open-workflow-btn-{id}`, `empty-state-container`, `new-workflow-btn-empty`, `workflow-list-error`).
  - Refactor `src/features/workflows/__tests__/workflow-list.spec.ts` to use `getByTestId(...)` exclusively.
  - Verify feature tests pass.

- [x] **Step 4: Refactor Workflow Studio Feature**
  - Update `src/features/workflow-studio/StudioHeader.tsx` & `WorkflowStudioPage.tsx` with `data-testid` attributes (`workflow-name-input`, `mode-design-toggle`, `mode-inspect-toggle`, `save-workflow-btn`, `run-workflow-btn`, `back-to-workflows-btn`, `draft-badge`, `view-execution-link`, `react-flow-canvas`, `studio-error-state`).
  - Refactor `src/features/workflow-studio/__tests__/canvas.spec.ts` to use `getByTestId(...)` exclusively.
  - Verify feature tests pass.

- [x] **Step 5: Refactor Executions Feature**
  - Update `src/features/executions/ExecutionsList.tsx`, `ExecutionHeader.tsx`, `ExecutionStatusBadge.tsx`, and `ExecutionView.tsx` with `data-testid` attributes (`executions-list-heading`, `refresh-executions-btn`, `executions-error-banner`, `executions-empty-state`, `executions-table-container`, `execution-row-{id}`, `execution-workflow-name-{id}`, `execution-status-cell-{id}`, `execution-duration-{id}`, `execution-timestamp-{id}`, `execution-failed-step-{id}`, `open-execution-link-{id}`, `execution-status-badge`, `execution-header-title`, `execution-header-refresh-btn`, `open-workflow-definition-link`, `execution-canvas-container`, `execution-error-view`).
  - Refactor `src/features/executions/__tests__/execution-detail.spec.ts` to use `getByTestId(...)` exclusively.
  - Verify feature tests pass.

- [x] **Step 6: Refactor App Layout & Smoke Tests**
  - Update `src/layouts/AppSidebar.tsx` & `src/features/landing/LandingPage.tsx` with `data-testid` attributes (`nav-link-workflows`, `nav-link-executions`, `nav-link-settings`, `overview-heading`, `landing-card-workflows`, `landing-card-executions`, `landing-card-settings`).
  - Refactor `tests/smoke.spec.ts` to use `getByTestId(...)` exclusively.
  - Verify smoke tests pass.

- [x] **Step 7: Final Verification & Coverage Update**
  - Run full Playwright test suite (`yarn test` / `npx playwright test`).
  - Update `frontend/tests/feature-coverage.md`.
