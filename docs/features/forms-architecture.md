# Workflow forms

Forms are **workflow-native**: a `FORM` trigger exposes a public hosted URL; an optional `FORM` task allows intermediate input collection (`INPUT`), terminal completion UX (`COMPLETION`), or both (`INPUT_AND_COMPLETE`). Standard single-page forms require zero canvas form tasks, completing directly from the trigger's configuration.

## Model

- **Trigger (`TriggerType.FORM`)** — `FormTriggerConfig`: slug, landing `FormSchema`, completion message/redirect, auth mode (public v1).
- **Tasks** — Unified `FORM` (`FormTaskParameters`: `formMode`, `page`, `endType`, `message`, `redirectUrl`, `customHtml`, `continueWorkflow`).
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
2. On `FORM` input tasks, executor PAUSEs; public API issues HMAC session token bound to execution + current task.
3. Step POST validates token, records answers, resumes engine; repeats until all form steps or workflow completes.
4. UI receives `FormPublicViewDto` phase: `LANDING`, `STEP`, or `COMPLETE`.

## Studio & ops

- Configure trigger in **When workflow runs** → Form tab (slug, visual landing builder, public/test URLs, embed HTML).
- Add optional **Form** (`FORM`) tasks on the canvas (`FormSchemaBuilder`: drag reorder + 12-col grid; or completion settings).
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
