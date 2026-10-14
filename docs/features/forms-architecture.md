# Workflow forms

Forms are **workflow-native**: a `FORM` trigger exposes a public hosted URL; each `FORM_PAGE` task pauses the run until the respondent submits; `FORM_END` defines completion UX.

## Model

- **Trigger (`TriggerType.FORM`)** — `FormTriggerConfig`: slug, landing `FormSchema`, optional completion message/redirect, auth mode (public v1).
- **Tasks** — `FORM_PAGE` (`FormPageTaskParameters.page`), `FORM_END` (`FormEndTaskParameters`).
- **Schema** — `FormSchema` → `FormPageDefinition` → `FormFieldDefinition` / `FormFieldType` (shared with future human-task forms).

## Persistence

- `FormRegistrations` — slug per environment (`{slug}` prod, `{slug}-test` test), signing secret for session tokens. Synced on workflow save.
- `FormSubmissions` — one row per execution; append-only step records (landing + each page).

## Public API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/forms/public/{slug}` | Load prod landing |
| POST | `/forms/public/{slug}/submit` | Landing or step (body includes optional `sessionToken`) |
| GET | `/forms/public/test/{slug}` | Test landing |
| POST | `/forms/public/test/{slug}/submit` | Test submit |

Ingress skips org/session filters on `/forms/public/*` (same as webhooks).

## Execution flow

1. Landing POST validates answers, starts execution with `TriggerType.FORM`, waits until PAUSED/COMPLETED/FAILED.
2. On `FORM_PAGE`, executor PAUSEs; public API issues HMAC session token bound to execution + current task.
3. Step POST validates token, records answers, resumes engine; repeats until `FORM_END` or workflow completes.
4. UI receives `FormPublicViewDto` phase: `LANDING`, `STEP`, or `COMPLETE`.

## Studio & ops

- Configure trigger in **When workflow runs** → Form tab (slug, visual landing builder, public/test URLs, embed HTML).
- Add **Form page** / **Form end** tasks on the canvas (`FormSchemaBuilder`: drag reorder + 12-col grid).
- Submissions: studio **Submissions** button → `GET /workflows/{workflowDefinitionId}/form-submissions` (answers decrypted server-side).
- Test forms use the same public slug with `?test=1`; registrations are stored as `{slug}-test` in Mongo.

## Frontend runtime

Public route `/f/:slug` renders `FormRenderer` against `/rest/forms/public/...`.

## Layout customization

Each `FormPageDefinition` supports:

- `layoutMode`: `STACK` (single column, dnd reorder) or `GRID` (12-column `react-grid-layout`).
- Per-field `layout`: `{ x, y, w, h }` (grid units).

Studio **FormSchemaBuilder** edits schema; runtime **FormRenderer** respects the same model.

## Deferred capabilities

Documented in [forms-library-research.md](./forms-library-research.md): rate limits, file uploads, virus scanning.

## UI stack

- Builder: `@dnd-kit/*` + `react-grid-layout` (see library research doc).
- Runtime: shared `FormRenderer` + app design system (no separate form SaaS embed).
