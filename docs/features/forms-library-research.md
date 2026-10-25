# Forms — library & deferral decisions

## Deferred (document only — not in current build)

| Topic | Decision |
|--------|----------|
| Rate limiting | **Not required now.** Add when abuse becomes a concern (Redis sliding window per slug/IP). |
| File upload fields | **Deferred.** `FILE` field type remains in enum for forward compatibility; builder shows as disabled; server rejects answers for `FILE` with a clear validation error. |
| Virus scanning | **Later.** When file uploads ship, scan at upload edge (ClamAV / cloud AV) before persisting blobs. |
| Captcha | Schema flag exists (`captchaEnabled`); wiring optional later. |

## Frontend libraries (added to `frontend/package.json`)

| Package | Role | Why not SurveyJS / Form.io |
|---------|------|---------------------------|
| **@dnd-kit/core**, **@dnd-kit/sortable**, **@dnd-kit/utilities** | Drag-and-drop field list, reorder in studio | MIT, works with React 19; full control over UX and our schema |
| **react-grid-layout** | 12-column responsive grid for **layout customization** (field `x,y,w,h`) | Industry standard; stores layout in `FormPageDefinition` |

**Not added (on purpose):**

- **SurveyJS Creator** — strong builder but commercial license for closed SaaS; heavy bundle.
- **Form.io** — full platform overlap; harder to align with workflow graph.
- **@rjsf/core** — good for JSON Schema runtime, but we already use **Radix/shadcn** inputs; custom `FormRenderer` keeps one design system and maps 1:1 to our Java `FormSchema` (no JSON Schema drift).

**Runtime:** `FormRenderer` uses existing UI primitives (`Input`, `Select`, `Label`, etc.) + `react-grid-layout` when `layoutMode === 'GRID'`.

**Builder:** `FormSchemaBuilder` — palette + dnd-kit sortable (stack mode) or grid mode with `react-grid-layout`; live preview pane.

## Backend libraries

| Approach | Decision |
|----------|----------|
| New form framework | **None.** Reuse existing **Jackson** DTOs (`FormSchema`), **SpEL** via `RuleEvaluator` for `visibleWhen` / `requiredWhen` (phase 2 wire-up), **jakarta.validation** on API DTOs where needed. |
| Validation | **`FormAnswerValidator`** in common module (extend for types/patterns; reject `FILE`). |

## No legacy compatibility

- Human task `formSchema` must be a **`FormSchema` object** (pages/fields/layout). Raw arbitrary JSON is not migrated; editors show builder from empty schema if invalid.

## Plan cross-link

See [forms-architecture.md](./forms-architecture.md) and workspace plan `workflow_forms_feature_408016f3.plan.md` (updated with this appendix).
