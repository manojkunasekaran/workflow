# Platform Feature Coverage

> This document maps every implemented feature across the stack.  
> Keep this up to date when adding or removing features.

---

## Backend Features

### Workflow Management
- **CRUD for Workflow Definitions** — Create, read, update, delete workflow definitions via `WorkflowDefinitionController`.
- **Variable System** — Workflow-level variables (`$variables.*`) defined per definition and resolved at runtime.

### Execution Engine (`WorkflowEngine`)
- **Async Execution** — Trigger via RabbitMQ message queue; returns immediately with `ACCEPTED (202)`.
- **Sync Execution** — Trigger via gRPC; blocks until workflow completes, used by the Studio "Run" button.
- **Execution Tracking** — Full lifecycle tracking: `QUEUED → RUNNING → COMPLETED / FAILED / PAUSED`.
- **Task-level Audit Trail** — Every task execution persists its status, start/end time, inputs, outputs, and error message.
- **Variable Resolution** — Template expression engine supporting `{{$input.*}}`, `{{$tasks.<id>.*}}`, `{{$variables.*}}`, `{{$loop.*}}`, `{{$env.*}}`.
- **Resume from Pause** — Engine can resume a paused workflow from the `currentTaskId` cursor (used by Human Tasks).

### Task Types
| Task | Description |
|---|---|
| `HTTP_TASK` | GET, POST, PUT, DELETE with headers, body, and variable substitution |
| `SCRIPT_TASK` | Script/code execution (plugin registered, executor planned) |
| `CONDITIONAL` | Rule-based branching (If/Else) with configurable condition groups |
| `ITERATOR_TASK` | Loop over arrays, objects, or numeric ranges |
| `HUMAN_TASK` | Pauses workflow, awaits a human form response with configurable actions |
| `BRANCH` | Splits workflow into concurrent parallel execution paths |
| `JOIN` | Gathers parallel branches; supports `FAIL_FAST`, `WAIT_FOR_ALL`, `REQUIRE_ALL` strategies |
| `WAIT` | Delays execution for a configurable duration with variable substitution |
| `DATA_TRANSFORM` | Transforms/maps data between tasks (plugin registered) |

### Messaging & Infrastructure
- **RabbitMQ** — Async workflow dispatch with dead-letter exchange for failed messages.
- **gRPC** — Sync workflow dispatch from API → Core service.
- **MongoDB** — Persistence for workflow definitions, executions, and task executions.
- **Redis + SSE** — Real-time execution event streaming to the frontend via Server-Sent Events.

### API Endpoints
| Method | Path | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/workflows` | Workflow definition CRUD |
| `POST` | `/executions/{definitionId}` | Trigger execution (SYNC or ASYNC) |
| `GET` | `/executions` | List all executions (paginated) |
| `GET` | `/executions/{id}` | Get execution by ID |
| `GET` | `/executions/{id}/tasks` | Get all task executions for a run |
| `GET` | `/executions/{id}/stream` | SSE stream for live execution updates |
| `POST` | `/executions/{id}/tasks/{taskId}/respond` | Submit a human task response |

---

## Frontend Features

### Pages & Routing
| Route | Page | Description |
|---|---|---|
| `/` | Landing Page | App home / overview |
| `/workflows` | Workflow List | Browse, search, create, delete workflows |
| `/workflows/:id` | Workflow Studio | Visual canvas for designing workflows |
| `/executions` | Executions List | View all execution history |
| `/executions/:id` | Execution Detail | Inspect a specific execution run |
| `/settings` | Settings | Theme, profile, system health |

### Workflow Studio (`/workflows/:id`)
- **Visual Canvas** — React Flow–powered drag-and-drop canvas with auto-layout (tidy-up).
- **Design / Inspect Modes** — Toggle between design (editing) and inspect (read-only execution view) via the header.
- **Task Catalog** — Side panel listing all available task types, drag onto canvas to add.
- **Task Config Dialog** — Per-task configuration form rendered dynamically from plugin schemas.
- **Inline Workflow Renaming** — Edit workflow name directly in the studio header.
- **Save** — Persists the current canvas state to the backend; "Draft" badge shown when unsaved.
- **Run Workflow** — Triggers a sync execution and links to the result.
- **View Last Execution** — "View execution" link appears in header after a run.
- **Undo / Redo** — Full canvas history (50 steps) via `zundo` middleware on the Zustand store.
- **Dirty State Tracking** — Warns when there are unsaved changes.

### Task Config Fields (per task plugin)
- HTTP Task: method, URL, headers, request body
- Conditional Task: condition groups with rule builder (`ConditionalBranchListField`)
- Iterator Task: source expression, loop body configuration
- Human Task: assignee, form fields, configurable actions (`HumanActionListField`)
- Branch Task: parallel branch list with start/end task references (`BranchListField`)
- Join Task: join strategy, timeout
- Wait Task: duration with unit selector (`WaitDurationField`)
- Task cross-references: `TaskRefField` for referencing other tasks by ID

### Executions (`/executions`, `/executions/:id`)
- **Executions List** — Tabular view sorted by recency; shows workflow name, status badge, duration, start time, and failed step ID.
- **Execution Detail** — Read-only canvas overlaid with live execution status per node (colour-coded).
- **Live Streaming** — SSE connection updates node statuses in real-time with exponential-backoff reconnect.
- **Task Execution Dialog** — Click any node to open a dialog showing task inputs, outputs, logs, and error details.
- **Human Task Respond Form** — Inline form inside the task dialog for submitting human task responses mid-execution.
- **Refresh** — Manual refresh button to re-fetch execution state.

### Settings (`/settings`)
- **Theme Switcher** — Light / Dark / System theme toggle (persisted via `localStorage`).
- **Profile Settings** — Name and email fields (UI placeholder; not yet wired to auth backend).
- **System Status** — Live API health check displaying backend connectivity.

### Shared Infrastructure
- **Axios API Layer** — Centralised API clients: `workflowApi`, `executionApi`, `healthApi`.
- **Zustand Store** — Canvas state management with `zundo` temporal middleware for undo/redo.
- **Radix UI + Tailwind** — Accessible component primitives with consistent design tokens.
- **React Router v7** — Client-side routing with nested layouts.

---

## Test Coverage

> **Locators Standard**: All Playwright E2E specs exclusively use `data-testid` locators to ensure deterministic and resilient test execution.

| Area | Location | Status |
|---|---|---|
| App smoke tests (all routes + edge cases) | `tests/smoke.spec.ts` | ✅ Written |
| Workflow list (happy, empty, error, edge) | `src/features/workflows/__tests__/` | ✅ Written |
| Workflow studio canvas (load, name edit, modes, save, run) | `src/features/workflow-studio/__tests__/` | ✅ Written |
| Execution list (happy, empty, error, edge) | `src/features/executions/__tests__/` | ✅ Written |
| Execution detail (load, canvas, error, edge) | `src/features/executions/__tests__/` | ✅ Written |
| Settings (theme, health, profile form) | `src/features/settings/__tests__/` | ✅ Written |
| Human task respond flow | `src/features/executions/__tests__/` | ✅ Written |
| Task config dialog fields (per task type) | `src/features/workflow-studio/__tests__/` | ✅ Written |
| Undo / redo keyboard shortcuts | `src/features/workflow-studio/__tests__/` | ✅ Written |
| Live SSE streaming updates | `src/features/executions/__tests__/` | ✅ Written |
| Landing Page / Home Screen | `src/features/landing/__tests__/` | ✅ Written |
| API Client Layer (`workflowApi`, `executionApi`, `healthApi`) | `src/api/__tests__/` | ✅ Written |
| Zustand Store & History (`workflowStore`) | `src/features/workflow-studio/store/__tests__/` | ✅ Written |
| Graph Utility Library (`workflowGraph`) | `src/features/workflow-studio/lib/__tests__/` | ✅ Written |

---

## Comprehensive Application-Level Test Plan

> Target: **500+ distinct test cases** spanning every module in the frontend.  
> Each section is independently appendable. Add new sections as features grow.  
> File: `src/features/landing/__tests__/landing.spec.ts` | `src/layouts/__tests__/`

---

### A. Landing Page (`/`)
> File: `src/features/landing/__tests__/landing.spec.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| A-001 | Spec | Happy | Navigate to `/` — heading with `data-testid="overview-heading"` is visible | ✅ Written |
| A-002 | Spec | Happy | Three navigation cards render: Workflows, Executions, Settings | ✅ Written |
| A-003 | Spec | Happy | `data-testid="landing-card-workflows"` is visible | ✅ Written |
| A-004 | Spec | Happy | `data-testid="landing-card-executions"` is visible | ✅ Written |
| A-005 | Spec | Happy | `data-testid="landing-card-settings"` is visible | ✅ Written |
| A-006 | Spec | Happy | Clicking Workflows card navigates to `/workflows` | ✅ Written |
| A-007 | Spec | Happy | Clicking Executions card navigates to `/executions` | ✅ Written |
| A-008 | Spec | Happy | Clicking Settings card navigates to `/settings` | ✅ Written |
| A-009 | Spec | Happy | Page background has the `.studio-dot-grid` class applied | ✅ Written |
| A-010 | Spec | Happy | Each card shows its icon, title, and description text | ✅ Written |
| A-011 | Spec | Edge | In dark mode, background dot colours use dark CSS variables | ✅ Written |
| A-012 | Spec | Edge | In light mode, background dot colours use light CSS variables | ✅ Written |
| A-013 | Unit | Happy | Render `LandingPage` — all three option items appear in the DOM | ✅ Written |
| A-014 | Unit | Happy | Mock `useNavigate` — clicking a card calls navigate with the correct path | ✅ Written |
| A-015 | Unit | Edge | Render with no router context — component throws an expected error boundary | ⬜ Planned |

---

### B. App Navigation & Layout (`AppLayout`, `AppSidebar`, `PageHeader`)
> File: `src/layouts/__tests__/navigation.spec.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| B-001 | Spec | Happy | `data-testid="app-layout-main"` is visible on every route | ✅ Written |
| B-002 | Spec | Happy | `data-testid="nav-link-workflows"` is present in sidebar | ✅ Written |
| B-003 | Spec | Happy | `data-testid="nav-link-executions"` is present in sidebar | ✅ Written |
| B-004 | Spec | Happy | `data-testid="nav-link-settings"` is present in sidebar | ✅ Written |
| B-005 | Spec | Happy | Clicking sidebar Workflows link routes to `/workflows` | ✅ Written |
| B-006 | Spec | Happy | Clicking sidebar Executions link routes to `/executions` | ✅ Written |
| B-007 | Spec | Happy | Clicking sidebar Settings link routes to `/settings` | ✅ Written |
| B-008 | Spec | Happy | Active route link is visually highlighted in the sidebar | ✅ Written |
| B-009 | Spec | Happy | App logo/brand mark renders in the sidebar header | ✅ Written |
| B-010 | Spec | Edge | Unknown route `/does-not-exist` — layout still mounts without crash | ✅ Written |
| B-011 | Spec | Edge | Deeply nested unknown route `/a/b/c/d` — layout still mounts | ✅ Written |
| B-012 | Spec | Edge | Window resize to mobile viewport — sidebar collapses or hides | ✅ Written |
| B-013 | Unit | Happy | Render `AppSidebar` — all nav links present | ✅ Written |
| B-014 | Unit | Happy | `PageHeader` renders `title` slot content correctly | ✅ Written |
| B-015 | Unit | Edge | `use-mobile` hook returns `true` when viewport width < 768px | ✅ Written |
| B-016 | Unit | Edge | `use-mobile` hook returns `false` when viewport width ≥ 768px | ✅ Written |

### 1. App Navigation & Core Layout
- **High Level / E2E (Spec - Playwright)**: 
  - **Routing Traversal**: Navigate through `/`, `/workflows`, `/workflows/new`, `/executions`, and `/settings`. Verify URL changes and correct page components mount.
  - **Theme & Styling**: Verify the `studio-dot-grid` background on the Landing Page. Toggle between Light, Dark, and System themes in Settings and assert CSS variable changes globally.
  - **Sidebar & Responsiveness**: Test sidebar collapse/expand behavior. Verify mobile viewport responsiveness for the main navigation layout.
- **Unit / Integration (Vitest)**: 
  - Render `AppLayout`, `LandingPage`, and `AppSidebar` with mocked `MemoryRouter`. Verify static content, navigation links, and theme toggle state updates.

### 2. Workflow Management (List & CRUD)
- **High Level / E2E (Spec - Playwright)**: 
  - **Happy Path**: Click "Create Workflow", enter a name, and save. Verify redirection to the Studio. Return to the list and verify the new workflow appears.
  - **Deletion**: Trigger workflow deletion, accept the confirmation dialog, and verify it is removed from the list.
  - **Edge Cases**: Test the empty state UI when no workflows exist. Mock a 500 API error on fetch and verify the error boundary / toast notification displays gracefully.
- **Unit / Integration (Vitest)**: 
  - Test `WorkflowListPage` rendering with populated and empty mocked API data. Validate the search/filter logic locally if implemented.

### 3. Workflow Studio Canvas Mechanics
- **High Level / E2E (Spec - Playwright)**: 
  - **Drag & Drop**: Open the Task Catalog, drag an `HTTP_TASK` onto the canvas. Verify a new node is created.
  - **Graph Wiring**: Connect a source node to a target node. Verify the edge is created. Attempt to connect a node to itself (cycle) and verify it is rejected.
  - **Branching & Joining**: Insert a `BRANCH` task, wire multiple parallel chains, and consolidate them into a `JOIN` task. Verify the visual layout logic.
  - **Undo / Redo**: Move a node, add an edge. Press `Ctrl+Z`, verify the edge disappears. Press `Ctrl+Y`, verify it reappears.
  - **Auto-Layout**: Create a messy graph, click "Tidy Up", and verify the nodes align structurally.
- **Unit / Integration (Vitest)**: 
  - Test DAG graph utilities in `workflowGraph.ts`: cycle detection, valid connection checks, edge insertion, and topological sorting.
  - Test the `zundo` temporal store logic by dispatching state changes and validating the history stack.

### 4. Task Plugin Configurations & Validation (Per Task Type)

#### HTTP Task (`HTTP_TASK`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Drag HTTP task to canvas. Open config. Verify HTTP method dropdown (GET, POST, PUT, DELETE). Enter URL with variables (e.g., `{{$variables.apiUrl}}`). Add headers and JSON body. Verify canvas node visually displays the configured URL and method.
  - *Edge Cases*: Add and delete multiple key-value pairs in the Headers section. Switch methods to ensure the body field hides for GET requests.
  - *Error States*: Submit with an empty URL. Verify inline validation error messages appear immediately.
- **Unit / Integration (Vitest)**: 
  - Test `HttpTaskPlugin` Zod schema. Assert required fields (URL is mandatory, must be valid URI or variable syntax). 
  - Test payload serialization logic for headers and body to ensure correct JSON formatting before API transmission.

#### Conditional Task (`CONDITIONAL`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Drag Conditional task. Use `ConditionalBranchListField` to add multiple `IF/ELSE` rule blocks. Wire different branches from the node based on conditions.
  - *Edge Cases*: Test compound logic by adding both `AND` and `OR` nested conditions within a single IF block. Delete a middle condition block and verify the remaining blocks re-index correctly and graph edges update.
  - *Error States*: Submit an empty condition rule. Verify validation blocks the save action.
- **Unit / Integration (Vitest)**: 
  - Test Zod schema for deeply nested rule conditions (validating recursive types).
  - Ensure a default `fallback` path always exists. Test `ConditionalBranchListField` component rendering and state updates in isolation.

#### Iterator Task (`ITERATOR_TASK`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Open config for Iterator task. Enter array variable `{{$input.items}}`. Verify nested loop body configuration accepts inner tasks.
  - *Edge Cases*: Nest another Iterator inside the loop body (if allowed) or verify it is blocked (if restricted). Ensure tasks dropped in the iterator accurately reflect their parent ID.
- **Unit / Integration (Vitest)**: 
  - Assert `IteratorTaskPlugin` strictly requires an iterable expression. Validate the schema rejects static non-array patterns.

#### Human Task (`HUMAN_TASK`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Open config. Assign task to a specific user/group (variable support). Define custom dynamic form fields (Text, Dropdown, Checkbox) via `HumanActionListField`.
  - *Edge Cases*: Change a form field type dynamically and verify the UI resets the specific field's options. Add multiple completion actions (e.g., "Approve", "Reject").
- **Unit / Integration (Vitest)**: 
  - Test Zod validation ensuring at least one completion action exists (cannot have a human task with no way to progress). Test component rendering for dynamic form generation.

#### Branch & Join Tasks (`BRANCH` / `JOIN`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Drag a Branch task. Configure multiple parallel execution paths. Follow up with a Join task. Select `WAIT_FOR_ALL` vs `FAIL_FAST` strategies.
  - *Edge Cases*: Try to place a `JOIN` task without a preceding `BRANCH` (should show error). Delete a branch path and verify it prevents dangling paths in the graph.
- **Unit / Integration (Vitest)**: 
  - Assert `BranchTaskPlugin` accurately manages dynamic reference generation. Test `JoinTaskPlugin` for timeout field validations (must be >= 0).

#### Wait Task (`WAIT`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Open Wait config. Enter duration value and select unit (seconds, minutes, hours) from `WaitDurationField`.
  - *Error States*: Enter negative numbers or invalid string characters. Verify validation blocks the input.
- **Unit / Integration (Vitest)**: 
  - Validate Zod schema strictly ensures duration is a positive integer or valid variable expression. Test unit converter utility logic for accuracy.

#### Script & Data Transform Tasks (`SCRIPT_TASK` / `DATA_TRANSFORM`)
- **High Level / E2E (Spec - Playwright)**: 
  - *Happy Path*: Open config. Test embedded code editor (Monaco/CodeMirror) for proper syntax highlighting and line numbering.
  - *Edge Cases*: Type invalid syntax (e.g., missing brackets in JS) and verify the editor surfaces visual linting errors.
- **Unit / Integration (Vitest)**: 
  - Validate schema for script input strings ensuring no empty execution blocks or exceeding character limits.

### 5. Execution Engine (Trigger & Monitor)
- **High Level / E2E (Spec - Playwright)**: 
  - **Sync Run**: From the Studio, click "Run". Verify the application saves the workflow, triggers execution, and navigates to the Execution Detail view.
  - **Live SSE Streaming**: On the Execution Detail page, mock the `/executions/:id/stream` SSE endpoint to emit synthetic events (`QUEUED` -> `RUNNING` -> `COMPLETED`). Verify the canvas node colors and status badges update dynamically in real-time.
  - **Audit Dialog**: Click a completed node. Verify the dialog opens displaying the correct Input, Output, and Execution Logs.
- **Unit / Integration (Vitest)**: 
  - Test the `executionNodeStatus.ts` utility for correctly mapping backend state to frontend visual states.
  - Test the custom SSE React hook for proper parsing of event chunks, automated reconnection, and exponential backoff on disconnects.

### 6. Human Task Respond Flow
- **High Level / E2E (Spec - Playwright)**: 
  - **Interaction**: Load an execution containing a `PAUSED` Human Task. Click the node to open the dialog.
  - **Form Submission**: Fill out the dynamically generated form fields. Click "Respond". Intercept the API call to verify the exact payload schema sent. Verify the UI updates to a loading state, then to `COMPLETED`.
- **Unit / Integration (Vitest)**: 
  - Render the Human Task Respond form in isolation. Pass a mocked task schema. Verify that dynamic fields (text, dropdowns) render properly and enforce their specific validation rules locally before submission.

---

### C. API Client Layer (`workflowApi`, `executionApi`, `healthApi`)
> File: `src/api/__tests__/api.test.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| C-001 | Unit | Happy | `workflowApi.getAll()` — sends GET `/rest/workflows`, returns array | ✅ Written |
| C-002 | Unit | Happy | `workflowApi.getById(id)` — sends GET `/rest/workflows/:id`, returns object | ✅ Written |
| C-003 | Unit | Happy | `workflowApi.create(def)` — sends POST `/rest/workflows` with body, returns saved object | ✅ Written |
| C-004 | Unit | Happy | `workflowApi.update(id, def)` — sends PUT `/rest/workflows/:id` with body | ✅ Written |
| C-005 | Unit | Happy | `workflowApi.delete(id)` — sends DELETE `/rest/workflows/:id` | ✅ Written |
| C-006 | Unit | Negative | `workflowApi.getById('bad-id')` — 404 response propagates as rejected promise | ✅ Written |
| C-007 | Unit | Negative | `workflowApi.create()` — 500 response propagates as rejected promise | ✅ Written |
| C-008 | Unit | Happy | `executionApi.trigger(id, 'ASYNC')` — sends POST to correct endpoint | ✅ Written |
| C-009 | Unit | Happy | `executionApi.trigger(id, 'SYNC')` — sends POST with correct mode param | ✅ Written |
| C-010 | Unit | Happy | `executionApi.getAll(page, size)` — sends GET with page/size query params | ✅ Written |
| C-011 | Unit | Happy | `executionApi.getById(id)` — sends GET `/rest/executions/:id` | ✅ Written |
| C-012 | Unit | Happy | `executionApi.getTaskExecutions(id)` — sends GET `/rest/executions/:id/tasks` | ✅ Written |
| C-013 | Unit | Happy | `executionApi.respondToHumanTask(execId, taskId, payload)` — sends POST to correct path | ✅ Written |
| C-014 | Unit | Negative | `executionApi.getById('missing')` — 404 propagates as rejected promise | ✅ Written |
| C-015 | Unit | Happy | `healthApi.check()` — sends GET `/actuator/health`, returns status object | ✅ Written |
| C-016 | Unit | Negative | `healthApi.check()` — network abort propagates as rejected promise | ✅ Written |
| C-017 | Unit | Edge | Axios base URL is read from `VITE_API_BASE_URL` env variable | ⬜ Planned |
| C-018 | Unit | Edge | Request Content-Type header is `application/json` for POST/PUT | ⬜ Planned |

---

### D. Zustand Store + Temporal History (`workflowStore`)
> File: `src/features/workflow-studio/store/__tests__/workflowStore.test.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| D-001 | Unit | Happy | `setNodes(newNodes)` — store `nodes` state updates correctly | ✅ Written |
| D-002 | Unit | Happy | `setEdges(newEdges)` — store `edges` state updates correctly | ✅ Written |
| D-003 | Unit | Happy | `resetCanvas(nodes, edges)` — replaces both nodes and edges atomically | ✅ Written |
| D-004 | Unit | Happy | `onNodesChange([positionChange])` — node position updates apply | ✅ Written |
| D-005 | Unit | Happy | `onEdgesChange([addChange])` — edge add change applies to edges array | ✅ Written |
| D-006 | Unit | Happy | After `setNodes`, `temporal.pastStates` has length 1 | ✅ Written |
| D-007 | Unit | Happy | `temporal.undo()` — reverts nodes to previous state | ✅ Written |
| D-008 | Unit | Happy | `temporal.redo()` — reapplies undone state | ✅ Written |
| D-009 | Unit | Happy | `temporal.clear()` — empties past and future stacks | ⬜ Planned |
| D-010 | Unit | Edge | Multiple undo calls stop at the oldest state (stack floor) | ⬜ Planned |
| D-011 | Unit | Edge | Redo with empty future stack — state unchanged, no error thrown | ⬜ Planned |
| D-012 | Unit | Edge | `resetCanvas` then `temporal.clear()` — history stack is empty | ⬜ Planned |
| D-013 | Unit | Edge | 51 consecutive state changes — history capped at 50 (zundo limit) | ⬜ Planned |

---

### E. Graph Utility Library (`workflowGraph.ts` + supporting libs)
> File: `src/features/workflow-studio/lib/__tests__/workflowGraph.test.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| E-001 | Unit | Happy | `definitionToFlow(def)` — produces a Start node + one task node per task | ✅ Written |
| E-002 | Unit | Happy | `definitionToFlow(def)` — produces chain edges connecting Start → task1 → task2 | ✅ Written |
| E-003 | Unit | Happy | `definitionToFlow(def)` with stored layout — node positions restored from `layout` map | ✅ Written |
| E-004 | Unit | Happy | `flowToDefinition(name, nodes, edges)` — exported task array matches canvas nodes | ✅ Written |
| E-005 | Unit | Happy | `flowToDefinition` — layout block written with x/y for every task node | ✅ Written |
| E-006 | Unit | Happy | `appendTaskToChain` — new task appended to end of main spine | ✅ Written |
| E-007 | Unit | Happy | `appendTaskToChain` — returns `null` when spine is terminated by CONDITIONAL | ⬜ Planned |
| E-008 | Unit | Happy | `removeTaskFromChain` — removes node and heals edges | ✅ Written |
| E-009 | Unit | Happy | `removeTaskFromChain` on ITERATOR_TASK — also removes all loop-body child nodes | ⬜ Planned |
| E-010 | Unit | Happy | `placeDetachedTask` — new node placed at given position, not auto-wired | ⬜ Planned |
| E-011 | Unit | Happy | `addBranchTask` — wires task from a routing output handle | ⬜ Planned |
| E-012 | Unit | Happy | `appendBranchChainTask` — wires task via branch-chain edge | ⬜ Planned |
| E-013 | Unit | Happy | `appendJoinAtBranchEnd` — creates JOIN node linked to upstream BRANCH | ⬜ Planned |
| E-014 | Unit | Negative | `appendBranchChainTask` with type JOIN — returns `null` (rejected) | ⬜ Planned |
| E-015 | Unit | Negative | `appendJoinAtBranchEnd` with no upstream BRANCH node — returns `null` | ⬜ Planned |
| E-016 | Unit | Happy | `syncWorkflowLayout` — nodes re-positioned after tidy-up | ⬜ Planned |
| E-017 | Unit | Happy | `tidyUpWorkflowGraph` — all nodes have new consistent positions | ⬜ Planned |
| E-018 | Unit | Happy | `getOrderedTaskIds` — returns spine IDs in topological order | ⬜ Planned |
| E-019 | Unit | Happy | `nextTaskId` — increments suffix when base ID already exists | ⬜ Planned |
| E-020 | Unit | Edge | `nextTaskId` with empty existing set — returns base ID unchanged | ⬜ Planned |
| E-021 | Unit | Happy | `isValidStudioConnection` — allows valid source→target pair | ⬜ Planned |
| E-022 | Unit | Negative | `isValidStudioConnection` — rejects self-connection (source === target) | ⬜ Planned |
| E-023 | Unit | Negative | `isValidStudioConnection` — rejects duplicate existing edge | ⬜ Planned |
| E-024 | Unit | Happy | `applyStudioConnection` — adds edge and returns updated nodes/edges | ⬜ Planned |
| E-025 | Unit | Happy | `findFirstTaskValidationError` — returns error string for invalid task | ⬜ Planned |
| E-026 | Unit | Happy | `findFirstTaskValidationError` — returns null for fully valid graph | ⬜ Planned |
| E-027 | Unit | Happy | `getTaskNodes` — filters out start/addTask nodes, returns only task nodes | ⬜ Planned |
| E-028 | Unit | Edge | `definitionToFlow` with empty tasks array — only Start + AddTask nodes produced | ✅ Written |
| E-029 | Unit | Edge | `flowToDefinition` — iterator loop body tasks excluded from top-level export | ⬜ Planned |
| E-030 | Unit | Edge | `getMainSpineIdsFromEdges` with a branched graph — only spine IDs returned |

---

### F. Task Config Field Components
> File: `src/features/workflow-studio/task-config/__tests__/`

| # | Type | Category | Test Case |
|---|---|---|---|
| F-001 | Unit | Happy | `ConditionalBranchListField` — renders existing IF/ELSE rules from data | ✅ Written |
| F-002 | Unit | Happy | `ConditionalBranchListField` — clicking "Add condition" appends a new row | ✅ Written |
| F-003 | Unit | Happy | `ConditionalBranchListField` — removing a rule re-indexes remaining rules | ✅ Written |
| F-004 | Unit | Negative | `ConditionalBranchListField` — empty condition expression shows validation error | ✅ Written |
| F-005 | Unit | Edge | `ConditionalBranchListField` — AND / OR operator toggle changes rule combinator | ✅ Written |
| F-006 | Unit | Happy | `HumanActionListField` — renders existing action list | ✅ Written |
| F-007 | Unit | Happy | `HumanActionListField` — adding action appends entry with default label | ✅ Written |
| F-008 | Unit | Happy | `HumanActionListField` — removing an action updates list correctly | ✅ Written |
| F-009 | Unit | Negative | `HumanActionListField` — empty action label triggers inline validation | ✅ Written |
| F-010 | Unit | Happy | `BranchListField` — renders configured branch paths | ✅ Written |
| F-011 | Unit | Happy | `BranchListField` — adding a branch appends a new entry | ✅ Written |
| F-012 | Unit | Happy | `BranchListField` — removing a branch updates entries | ✅ Written |
| F-013 | Unit | Happy | `WaitDurationField` — renders value and unit select | ✅ Written |
| F-014 | Unit | Happy | `WaitDurationField` — changing unit dropdown fires onChange with new unit | ✅ Written |
| F-015 | Unit | Negative | `WaitDurationField` — negative value input shows validation error |
| F-016 | Unit | Happy | `TaskRefField` — renders a dropdown of available task IDs from context | ✅ Written |
| F-017 | Unit | Happy | `TaskRefField` — selecting a task ID fires onChange with that ID | ✅ Written |
| F-018 | Unit | Edge | `TaskRefField` — excludes the current task's own ID from options |
| F-019 | Unit | Happy | `TaskFieldRenderer` — renders correct input type per schema field definition | ✅ Written |
| F-020 | Unit | Happy | `TaskFieldRenderer` — string field renders text input | ✅ Written |
| F-021 | Unit | Happy | `TaskFieldRenderer` — select field renders select dropdown | ✅ Written |
| F-022 | Unit | Happy | `TaskFieldRenderer` — segmented field renders toggle buttons | ✅ Written |
| F-023 | Unit | Edge | `TaskFieldRenderer` — unknown field type renders fallback input | ✅ Written |
| F-024 | Unit | Happy | `TaskParametersForm` — renders all fields defined in plugin schema | ✅ Written |
| F-025 | Unit | Happy | `waitDuration.ts` — `parseDuration('90s')` returns `{ value: 90, unit: 's' }` | ✅ Written |
| F-026 | Unit | Happy | `waitDuration.ts` — `formatDuration(2, 'm')` returns `'2m'` | ✅ Written |
| F-027 | Unit | Edge | `taskRefUtils.ts` — `getAvailableTaskRefs` excludes loop-body tasks | ✅ Written |

---

### G. Task Plugin Schemas & Validation Utils
> File: `src/features/workflow-studio/task-type-schema/__tests__/plugins.test.ts`

| # | Type | Category | Test Case | Status |
|---|---|---|---|---|
| G-001 | Unit | Happy | `httpTaskPlugin.validate` — valid GET config with URL passes | ✅ Written |
| G-002 | Unit | Negative | `httpTaskPlugin.validate` — empty URL fails with field error | ✅ Written |
| G-003 | Unit | Negative | `httpTaskPlugin.validate` — invalid URL (no protocol) fails | ✅ Written |
| G-004 | Unit | Edge | `httpTaskPlugin.validate` — URL as variable expression `{{$variables.url}}` passes | ✅ Written |
| G-005 | Unit | Happy | `conditionalTaskPlugin.validate` — valid IF/ELSE config passes | ✅ Written |
| G-006 | Unit | Negative | `conditionalTaskPlugin.validate` — no condition groups fails | ✅ Written |
| G-007 | Unit | Negative | `conditionalTaskPlugin.validate` — missing fallback branch fails | ✅ Written |
| G-008 | Unit | Happy | `humanTaskPlugin.validate` — config with assignee and one action passes | ✅ Written |
| G-009 | Unit | Negative | `humanTaskPlugin.validate` — zero actions defined fails | ✅ Written |
| G-010 | Unit | Negative | `humanTaskPlugin.validate` — empty assignee field fails | ✅ Written |
| G-011 | Unit | Happy | `iteratorTaskPlugin.validate` — valid iterable expression passes | ✅ Written |
| G-012 | Unit | Negative | `iteratorTaskPlugin.validate` — static non-array value fails | ✅ Written |
| G-013 | Unit | Edge | `iteratorTaskPlugin.validate` — `{{$input.items}}` expression passes | ✅ Written |
| G-014 | Unit | Happy | `branchTaskPlugin.validate` — at least 2 branches configured passes | ✅ Written |
| G-015 | Unit | Negative | `branchTaskPlugin.validate` — fewer than 2 branches fails | ✅ Written |
| G-016 | Unit | Happy | `joinTaskPlugin.validate` — strategy WAIT_FOR_ALL passes | ✅ Written |
| G-017 | Unit | Happy | `joinTaskPlugin.validate` — strategy FAIL_FAST passes | ✅ Written |
| G-018 | Unit | Happy | `joinTaskPlugin.validate` — strategy REQUIRE_ALL passes | ✅ Written |
| G-019 | Unit | Negative | `joinTaskPlugin.validate` — missing branchTaskId fails | ✅ Written |
| G-020 | Unit | Happy | `waitTaskPlugin.validate` — duration 30 with unit 's' passes | ✅ Written |
| G-021 | Unit | Negative | `waitTaskPlugin.validate` — duration 0 fails | ✅ Written |
| G-022 | Unit | Negative | `waitTaskPlugin.validate` — negative duration fails | ✅ Written |
| G-023 | Unit | Happy | `scriptTaskPlugin.validate` — non-empty script body passes | ✅ Written |
| G-024 | Unit | Negative | `scriptTaskPlugin.validate` — empty script body fails | ✅ Written |
| G-025 | Unit | Happy | `dataTransformTaskPlugin.validate` — valid mapping expression passes | ✅ Written |
| G-026 | Unit | Happy | `validateTaskParameters(plugin, params, ctx)` — returns empty errors for valid config | ✅ Written |
| G-027 | Unit | Negative | `validateTaskParameters` — returns keyed errors for invalid config | ✅ Written |
| G-028 | Unit | Happy | `injectParameterType(type, params)` — adds `type` key to params object | ✅ Written |
| G-029 | Unit | Edge | `fieldValidation.ts` — variable expression `{{$tasks.t1.output}}` passes regex | ✅ Written |
| G-030 | Unit | Edge | `fieldValidation.ts` — plain text without `{{}}` fails variable-only field | ✅ Written |

---

### H. Execution Feature Components & Utilities
> File: `src/features/executions/__tests__/`

| # | Type | Category | Test Case |
|---|---|---|---|
| H-001 | Spec | Happy | `ExecutionsList` — page heading visible at `/executions` |
| H-002 | Spec | Happy | `ExecutionsList` — each execution row has `data-testid="execution-row-{id}"` |
| H-003 | Spec | Happy | `ExecutionsList` — COMPLETED status badge visible on completed row |
| H-004 | Spec | Happy | `ExecutionsList` — FAILED status badge visible on failed row |
| H-005 | Spec | Happy | `ExecutionsList` — RUNNING row renders with no end time |
| H-006 | Spec | Happy | `ExecutionsList` — failed step ID shown in FAILED row |
| H-007 | Spec | Happy | `ExecutionsList` — RUNNING row shows `—` for failed step column |
| H-008 | Spec | Happy | `ExecutionsList` — clicking a row navigates to `/executions/:id` |
| H-009 | Spec | Happy | `ExecutionsList` — refresh button triggers API re-fetch |
| H-010 | Spec | Edge | `ExecutionsList` — empty state renders when API returns zero results |
| H-011 | Spec | Negative | `ExecutionsList` — error banner shown on 500 API response |
| H-012 | Spec | Negative | `ExecutionsList` — table hidden when API errors |
| H-013 | Spec | Happy | `ExecutionDetail` — `ExecutionHeader` title visible at `/executions/:id` |
| H-014 | Spec | Happy | `ExecutionDetail` — React Flow canvas renders with node statuses |
| H-015 | Spec | Happy | `ExecutionDetail` — Refresh button visible in header |
| H-016 | Spec | Negative | `ExecutionDetail` — error view shown on 404 execution load |
| H-017 | Spec | Edge | `ExecutionDetail` — navigating to different execution resets task dialog |
| H-018 | Spec | Happy | `TaskExecutionDialog` — opens on node click, shows task ID |
| H-019 | Spec | Happy | `TaskExecutionDialog` — Input tab shows task input data |
| H-020 | Spec | Happy | `TaskExecutionDialog` — Output tab shows task output data |
| H-021 | Spec | Happy | `TaskExecutionDialog` — Logs tab renders execution log entries |
| H-022 | Spec | Negative | `TaskExecutionDialog` — Error tab shows error message for FAILED task |
| H-023 | Spec | Edge | `TaskExecutionDialog` — tabs switch without page reload |
| H-024 | Spec | Happy | `HumanTaskRespondForm` — renders for PAUSED human task node |
| H-025 | Spec | Happy | `HumanTaskRespondForm` — filling form and clicking respond sends API request |
| H-026 | Spec | Negative | `HumanTaskRespondForm` — empty required field blocks submission |
| H-027 | Spec | Edge | `HumanTaskRespondForm` — payload matches expected schema on submit intercept |
| H-028 | Unit | Happy | `executionNodeStatus.ts` — `COMPLETED` maps to `completed` visual state |
| H-029 | Unit | Happy | `executionNodeStatus.ts` — `FAILED` maps to `failed` visual state |
| H-030 | Unit | Happy | `executionNodeStatus.ts` — `RUNNING` maps to `running` visual state |
| H-031 | Unit | Happy | `executionNodeStatus.ts` — `QUEUED` maps to `pending` visual state |
| H-032 | Unit | Happy | `executionNodeStatus.ts` — `PAUSED` maps to `paused` visual state |
| H-033 | Unit | Edge | `executionNodeStatus.ts` — unknown status string maps to `idle` |
| H-034 | Unit | Happy | `executionSummaryUtils.ts` — `getFailedStepId` returns first FAILED task ID |
| H-035 | Unit | Edge | `executionSummaryUtils.ts` — `getFailedStepId` returns null for COMPLETED run |
| H-036 | Unit | Happy | `executionDisplay.ts` — `formatDuration(5000)` returns human-readable string |
| H-037 | Unit | Edge | `executionDisplay.ts` — `formatDuration(0)` returns `< 1s` or equivalent |
| H-038 | Unit | Happy | `humanTaskExecution.ts` — `isHumanTask(node)` returns true for HUMAN_TASK type |
| H-039 | Unit | Happy | `loadExecutionGraph.ts` — merges task execution statuses onto canvas nodes |
| H-040 | Spec | Happy | SSE stream — synthetic RUNNING event updates node colour in real-time |
| H-041 | Spec | Happy | SSE stream — synthetic COMPLETED event updates node colour to green |
| H-042 | Spec | Negative | SSE stream — connection abort triggers reconnect attempt |
| H-043 | Unit | Happy | `ExecutionStatusBadge` — renders correct colour for COMPLETED status |
| H-044 | Unit | Happy | `ExecutionStatusBadge` — renders correct colour for FAILED status |
| H-045 | Unit | Happy | `ExecutionStatusBadge` — renders correct colour for RUNNING status |
| H-046 | Unit | Edge | `ExecutionStatusBadge` — unknown status renders neutral badge |
---

### I. Workflow List Feature (`WorkflowListPage`)
> File: `src/features/workflows/__tests__/workflow-list.spec.ts`

| # | Type | Category | Test Case |
|---|---|---|---|
| I-001 | Spec | Happy | `WorkflowListPage` — page heading is visible |
| I-002 | Spec | Happy | `WorkflowListPage` — "New Workflow" button is visible in header |
| I-003 | Spec | Happy | `WorkflowListPage` — "Refresh" button is visible |
| I-004 | Spec | Happy | `WorkflowListPage` — renders a row for each workflow returned by API |
| I-005 | Spec | Happy | `WorkflowListPage` — shows correct task count for each workflow row |
| I-006 | Spec | Happy | `WorkflowListPage` — shows truncated workflow ID in the table |
| I-007 | Spec | Happy | `WorkflowListPage` — clicking a workflow row navigates to the studio |
| I-008 | Spec | Happy | `WorkflowListPage` — clicking the arrow button navigates to the studio |
| I-009 | Spec | Happy | `WorkflowListPage` — clicking "New Workflow" navigates to `/workflows/new` |
| I-010 | Spec | Edge | `WorkflowListPage` — empty state message appears when no workflows exist |
| I-011 | Spec | Edge | `WorkflowListPage` — empty state shows a "New Workflow" CTA button |
| I-012 | Spec | Edge | `WorkflowListPage` — empty state CTA navigates to `/workflows/new` |
| I-013 | Spec | Negative | `WorkflowListPage` — error message displays when API fails |
| I-014 | Spec | Negative | `WorkflowListPage` — table container is hidden when API fails |
| I-015 | Spec | Negative | `WorkflowListPage` — Refresh button retries the API call on error |
| I-016 | Spec | Edge | `WorkflowListPage` — workflow with null `updatedAt` shows `createdAt` fallback |
| I-017 | Spec | Edge | `WorkflowListPage` — very long workflow name does not break layout |
| I-018 | Spec | Edge | `WorkflowListPage` — workflow with zero tasks shows "0" in task count column |

---

### J. Settings Feature (`SettingsPage`)
> File: `src/features/settings/__tests__/settings.spec.ts`

| # | Type | Category | Test Case |
|---|---|---|---|
| J-001 | Spec | Happy | `SettingsPage` — page heading is visible |
| J-002 | Spec | Happy | `SettingsPage` — Profile Settings section is visible |
| J-003 | Spec | Happy | `SettingsPage` — User Preferences section is visible |
| J-004 | Spec | Happy | `SettingsPage` — System Status section is visible |
| J-005 | Spec | Happy | `SettingsPage` — Theme buttons (Light, Dark, System) are visible |
| J-006 | Spec | Happy | `SettingsPage` — clicking Dark button applies `dark` class to html tag |
| J-007 | Spec | Happy | `SettingsPage` — clicking Light button removes `dark` class from html tag |
| J-008 | Spec | Edge | `SettingsPage` — theme preference persists across page navigations |
| J-009 | Spec | Happy | `SettingsPage` — shows "All Systems Operational" badge when health API returns UP |
| J-010 | Spec | Negative | `SettingsPage` — shows degraded status badge when health API returns DOWN |
| J-011 | Spec | Negative | `SettingsPage` — shows degraded status badge when health API is unreachable |
| J-012 | Spec | Happy | `SettingsPage` — Full Name input is editable |
| J-013 | Spec | Happy | `SettingsPage` — Email input is editable |
| J-014 | Spec | Happy | `SettingsPage` — "Update Profile" button is present |

---

### K. Workflow Studio Core UI & Canvas (`WorkflowStudioPage`)
> File: `src/features/workflow-studio/__tests__/canvas.spec.ts`

| # | Type | Category | Test Case |
|---|---|---|---|
| K-001 | Spec | Happy | `WorkflowStudioPage` — workflow name visible in header input |
| K-002 | Spec | Happy | `WorkflowStudioPage` — React Flow canvas container is visible |
| K-003 | Spec | Happy | `WorkflowStudioPage` — "Design" mode toggle active by default |
| K-004 | Spec | Happy | `WorkflowStudioPage` — "Inspect" mode toggle button is visible |
| K-005 | Spec | Happy | `WorkflowStudioPage` — Save button is visible |
| K-006 | Spec | Happy | `WorkflowStudioPage` — Run Workflow button is visible |
| K-007 | Spec | Happy | `WorkflowStudioPage` — Back button navigates back to `/workflows` |
| K-008 | Spec | Happy | `WorkflowStudioPage` — workflow name editable inline |
| K-009 | Spec | Happy | `WorkflowStudioPage` — editing workflow name shows "Draft" badge |
| K-010 | Spec | Happy | `WorkflowStudioPage` — switching to Inspect mode disables Run button |
| K-011 | Spec | Happy | `WorkflowStudioPage` — switching back to Design mode re-enables Run button |
| K-012 | Spec | Happy | `WorkflowStudioPage` — Save button disabled when no unsaved changes |
| K-013 | Spec | Happy | `WorkflowStudioPage` — Save button enabled after editing workflow name |
| K-014 | Spec | Happy | `WorkflowStudioPage` — clicking Save calls API and dismisses Draft badge |
| K-015 | Spec | Negative | `WorkflowStudioPage` — workflow API 404 does not crash page (shows canvas) |
| K-016 | Spec | Negative | `WorkflowStudioPage` — Save failure retains the Draft badge |
| K-017 | Spec | Edge | `WorkflowStudioPage` — "View execution" link appears after successful Run |
| K-018 | Spec | Edge | `WorkflowStudioPage` — workflow with empty name placeholder still allows saving |
| K-019 | Spec | Happy | `WorkflowCanvas` — dragging a task from catalog adds it to canvas |
| K-020 | Spec | Happy | `WorkflowCanvas` — clicking a task node opens its `TaskConfigDialog` |
| K-021 | Spec | Happy | `WorkflowCanvas` — auto-layout button tidies up messy node positions |
| K-022 | Spec | Happy | `WorkflowCanvas` — undo/redo keyboard shortcuts (Ctrl+Z / Ctrl+Y) revert/apply changes |
| K-023 | Spec | Edge | `WorkflowCanvas` — clicking delete key removes selected task node |
| K-024 | Spec | Edge | `WorkflowCanvas` — cannot delete the Start node |
| K-025 | Spec | Negative | `WorkflowCanvas` — creating invalid edge connection displays toast error |
| K-026 | Unit | Happy | `StudioNodeShell` — renders validation error ring when node has errors |
| K-027 | Unit | Happy | `StudioTaskCatalog` — filters task list based on search input |

---

### L. Shared UI Components & Hooks
> File: `src/components/ui/__tests__/` & `src/hooks/__tests__/`

| # | Type | Category | Test Case |
|---|---|---|---|
| L-001 | Unit | Happy | `Button` — renders with correct variant classes |
| L-002 | Unit | Happy | `Button` — renders loading spinner when `isLoading=true` |
| L-003 | Unit | Happy | `Dialog` — renders content in a portal when open |
| L-004 | Unit | Happy | `Input` — accepts and displays text values |
| L-005 | Unit | Happy | `Select` — displays options and calls `onValueChange` |
| L-006 | Unit | Happy | `StatusBadge` — renders text and correct colour classes |
| L-007 | Unit | Happy | `use-mobile` — returns true when `window.innerWidth < 768` |
| L-008 | Unit | Happy | `use-mobile` — updates state on window resize event |
