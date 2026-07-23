# Agents / AI Assistant Instructions

This file contains **mandatory standing instructions** for any AI assistant working on this codebase.
Read this file completely before making any code changes.

---

## Testing Requirements (Non-Negotiable)

### Rule: Every code change MUST be accompanied by a test.

When you add or modify any feature, component, API endpoint, utility function, or bug fix,
you MUST also write or update the corresponding test in the same response/commit.
Do NOT defer tests to a "later" task. Tests are part of the definition of done.

### Where to put tests

All tests live in a `__tests__/` folder **co-located inside the feature directory**.
Differentiate test type by file extension only:

| Extension | Tool | What it tests |
|---|---|---|
| `*.spec.ts` | Playwright | Full browser E2E — page navigation, user interactions, DOM assertions |
| `*.test.ts` | Vitest | Unit/integration — pure functions, Zustand stores, utility libs |

| What you changed | Where to add the test |
|---|---|
| A component or page in `src/features/<feature>/` | `src/features/<feature>/__tests__/<component>.spec.ts` (Playwright) |
| A utility function in `src/features/<feature>/lib/` | `src/features/<feature>/__tests__/<util>.test.ts` (Vitest) |
| A new API client method in `src/api/` | `src/api/__tests__/<api>.test.ts` (Vitest with axios-mock-adapter) |
| A Zustand store change in `src/features/*/store/` | `src/features/*/store/__tests__/*.test.ts` (Vitest) |
| App-wide smoke tests or shared helpers | `tests/` top-level folder |
| A backend endpoint in `backend/services/api/` | `backend/services/api/src/test/` (Spring Boot / Testcontainers) |
| A backend service/executor in `backend/services/core/` | `backend/services/core/src/test/` (Spring Boot unit test) |

### Test file naming conventions

- **Playwright E2E specs**: `<feature>.spec.ts`
- **Vitest unit/integration tests**: `<module>.test.ts`
- Always start every test file with: `// Should read the rules before creating/updating the test files`

### What to cover (minimum)

For every change, write at least:
- ✅ **1 happy path test** — the expected flow works correctly
- ✅ **1 negative/error path test** — what happens when things go wrong (API error, invalid input)
- ✅ **1 edge case test** — boundary conditions, empty states, null values

### Update feature-coverage.md

After writing tests, update `frontend/tests/feature-coverage.md` to reflect
the new or updated test coverage. Mark items as ✅ Written.

---

## Code Style Rules

- Use **yarn** (not npm) for all package management in the frontend.
- All frontend tests use **Playwright** for E2E and **Vitest** for unit/integration tests.
- All Playwright E2E tests MUST use `page.getByTestId('test-id')` exclusively to find and interact with UI elements. All interactive/testable elements in components MUST have matching `data-testid` attributes.
- Mock all API calls in tests using `page.route()` (Playwright) or `vi.mock()` / `axios-mock-adapter` (Vitest).
- Never use hardcoded `waitForTimeout()` in Playwright tests.
- Follow the co-location rule: feature tests live in `__tests__/` inside the feature directory.

---

## Before You Finish Any Task

Before declaring a task complete, ask yourself:
1. Did I write a test for every new/changed behaviour?
2. Did I update `feature-coverage.md`?
3. Does `yarn test` (Playwright) pass for the affected features?
