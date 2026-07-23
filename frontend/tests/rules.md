# Playwright Testing Rules

1. **Isolation**: Every test must be completely isolated and not rely on the state of previous tests.
2. **Locators**: Use `data-testid` attributes on all testable components and interact with them exclusively using `getByTestId('test-id')` in Playwright specs. This prevents brittle tests due to text or styling changes and avoids strict-mode locator collisions.
3. **Assertions**: Use web-first assertions (e.g., `expect(locator).toBeVisible()`). These automatically retry until the condition is met. NEVER use hardcoded timeouts (like `page.waitForTimeout()`) unless strictly required for debugging.
4. **Setup**: Use `test.beforeEach` hooks for common setup (like navigating to the page) to keep tests DRY.
5. **Mandatory Comment**: Every single test file must start with the comment `// Should read the rules before creating/updating the test files`.
6. **Co-location + Extension Convention (Hybrid)**: All tests — both E2E and unit — live in a `__tests__/` folder inside the feature directory. Differentiate by file extension:
   - `<feature>.spec.ts` → **Playwright E2E** (full browser, page interactions)
   - `<util>.test.ts` → **Vitest unit/integration** (no browser, pure functions, components)
   - Only app-wide smoke tests and shared helpers belong in the top-level `tests/` folder.
7. **Test with every change**: Any new feature, component, bug fix, or refactor MUST include at minimum one happy path, one negative path, and one edge case test in the same change. Tests are not optional or deferrable. See `AGENTS.md` at the repo root for the full policy.
