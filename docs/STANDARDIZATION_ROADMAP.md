# Workflow Platform Standardization Roadmap

This roadmap captures the path from a personal prototype to a stable, multi-user workflow automation platform. It focuses on product maturity, architectural boundaries, reliability, security, deployment operations, and end-user polish.

## Product Direction

The platform already has a strong foundation: a visual workflow studio, workflow definitions, execution tracking, credentials, connectors, OAuth support, async and sync execution paths, live execution updates, and an extensible task executor model.

The next phase should not be driven only by adding more nodes. The product needs a stable platform contract:

- Who owns a workflow.
- Who can run, edit, publish, delete, and inspect it.
- Which credentials and connectors are available to which workspace.
- How draft workflows differ from production workflows.
- How executions can be replayed, resumed, tested, audited, and debugged.
- How connector behavior stays predictable as the action catalog grows.

## Recommended Milestones

### Milestone 1: Platform Contract And Safety

Goal: make the app safe for more than one person to use.

- Add authentication and role-based access control.
- Introduce workspace or organization-scoped data access across workflows, executions, credentials, connector overrides, schedules, and audit logs.
- Replace hardcoded default organization behavior with a request-scoped tenant context.
- Define roles such as Owner, Admin, Builder, Operator, Viewer, and Integration Manager.
- Add server-side authorization checks for every write, run, delete, credential, connector, and admin endpoint.
- Hide internal IDs from primary UI surfaces unless needed for debugging, support, or API usage.
- Add a mature error state pattern across all screens.

Positive impact:
- Enables teams to safely collaborate.
- Prevents cross-tenant data leaks.
- Creates a foundation for billing, audit, sharing, and enterprise adoption.

Tradeoff:
- This touches many modules and should be implemented before large feature expansion.

### Milestone 2: Workflow Lifecycle

Goal: separate experimentation from production use.

- Introduce clear workflow states: Draft, Published, Deprecated, Archived.
- Make published workflow versions immutable.
- Pin every execution to the exact workflow version it started with.
- Add rollback to a previous published version.
- Keep draft test runs separate from production execution history.
- Add a migration strategy for paused or long-running workflows.
- Add validation gates before publishing.

Positive impact:
- Teams can edit safely without breaking live automations.
- Execution debugging becomes deterministic.

Tradeoff:
- Requires careful API and frontend changes because the current workflow ID/version model is partially implemented but not yet fully productized.

### Milestone 3: Execution Reliability

Goal: make execution behavior predictable under retries, failures, and scale.

- Add a workflow execution state machine.
- Add idempotency keys for trigger, resume, and test execution.
- Add task-level timeouts.
- Add retry policies per task and per connector action.
- Add circuit breakers for unstable external systems.
- Add checkpoint persistence at task boundaries.
- Add distributed locking for resume and parallel execution coordination.
- Add payload offloading for large task inputs and outputs.
- Add execution correlation IDs in logs and API responses.
- Define retention policies for task logs, payloads, and audit history.

Positive impact:
- Better crash recovery and fewer duplicate side effects.
- Easier debugging and customer support.

Tradeoff:
- Adds operational complexity and requires focused tests around edge cases.

### Milestone 4: Connector System Maturity

Goal: make integrations feel like a product, not a configuration editor.

- Treat connector manifests as versioned contracts.
- Expand connector action coverage for major integrations.
- Add action categories: triggers, searches, creates, updates, deletes, uploads, messages, AI actions, and utility actions.
- Add per-connection rate limiting.
- Add per-connector default rate limits and per-workspace overrides.
- Add credential health status, last verified time, and reconnect flows.
- Add system-managed OAuth credentials for first-party/prebuilt connectors.
- Allow user-owned custom OAuth app credentials for self-hosted or advanced setups.
- Link connector definitions to compatible credential types.
- Add uploaded connector icons in addition to public icon URLs.
- Normalize base URLs in code instead of requiring users to avoid trailing slashes.
- Generate connector internal keys as stable opaque IDs instead of deriving primary IDs directly from labels.
- Show user-friendly display names first, and move internal IDs into an advanced/details area after creation.

Positive impact:
- Integrations become easier for end users.
- Teams can use prebuilt connectors without understanding implementation details.

Tradeoff:
- Requires a clearer separation between "system connector catalog", "tenant connector overrides", "credential definitions", and "user connections".

### Milestone 5: AI And Agent Capabilities

Goal: make AI useful inside workflows without making the platform unpredictable.

- Continue developing the Agents node/task type.
- Add provider abstraction for OpenAI, Anthropic, Gemini, Azure OpenAI, Groq, Mistral, and others.
- Add model selection, token limits, temperature, response format, and tool permissions.
- Add prompt templates and reusable prompt variables.
- Add structured output validation.
- Add cost and token tracking per execution.
- Add model fallback policies.
- Add audit logs for prompts, tool calls, and generated outputs.
- Add redaction for secrets and sensitive variables.
- Add human approval gates for high-risk AI actions.

Positive impact:
- AI becomes a real differentiator for teams.
- Reduces risk when workflows can call external tools or mutate business data.

Tradeoff:
- AI task execution must be observable and governed, especially for enterprise users.

### Milestone 6: MCP Layer

Goal: allow workflows and agents to use external tools through a standard protocol.

**Done (Phases 1–3)**
- Outbound MCP client: `IntegrationCredential` (`MCP_SERVER`), SDK transports (HTTP, SSE, STDIO gated).
- Agents task MCP tools + `MCP_TOOL` task type.
- Inbound REST server: `MCP` trigger, exposure modes, bearer auth, audit logs — see [MCP_SERVER_AUTH.md](./MCP_SERVER_AUTH.md).
- Settings UI: server config, token regenerate, audit viewer, STDIO toggle.

**Backlog**
- Native MCP protocol server (Streamable HTTP JSON-RPC) — current inbound API is REST shim only.
- SSRF protection for outbound MCP URLs.
- Outbound MCP call audit (Agents + MCP_TOOL).
- Permission scopes / deny-lists per server and tool.
- MCP resources and prompts support.
- Rate limiting on inbound MCP endpoints.

Positive impact:
- The platform can integrate with a broad and growing tool ecosystem.
- Agents become more useful without every integration being hand-built as a connector.

Tradeoff:
- Tool permissions and security boundaries must be designed before broad MCP execution is enabled.

### Milestone 7: Distributed Server Management

Goal: scale execution across multiple workers and clusters.

- Support multiple core workers.
- Add worker registration and heartbeat tracking.
- Add queue partitioning by workspace, priority, or workflow type.
- Add backpressure controls.
- Add distributed scheduler coordination.
- Add execution routing metadata.
- Add multi-cluster deployment support for regional or tenant-isolated workloads.
- Add cluster-level health, capacity, and worker status UI.

Positive impact:
- Better reliability and scalability for larger teams.
- Enables enterprise deployment patterns.

Tradeoff:
- Should come after tenant isolation and execution idempotency.

## New Feature Roadmap

### Sub Workflows

Purpose:
- Allow one workflow to call another workflow as a reusable unit.

Recommended behavior:
- Add a `SUB_WORKFLOW` task type.
- Support input mapping from parent to child workflow.
- Support output mapping from child to parent workflow.
- Pin called sub workflows to published versions.
- Allow sync and async execution modes.
- Show nested execution traces.
- Prevent unsafe recursion or enforce explicit recursion limits.

Priority: High after workflow lifecycle is stable.

### Rate Limiting Per Connection

Purpose:
- Prevent integrations from exceeding external API quotas or damaging customer accounts.

Recommended behavior:
- Store limits at connector, connection, workspace, and action level.
- Support fixed window, sliding window, and token bucket policies.
- Make limits visible in connection details.
- Apply limits in connector execution, test execution, and scheduled runs.
- Emit clear "rate limited" execution events.

Priority: High for team-readiness.

### Agents Node / Task Type

Purpose:
- Use LLMs to reason, transform data, classify, draft, summarize, or coordinate tool calls.

Recommended behavior:
- Keep Agents as a first-class task type, not just a connector action.
- Separate model provider credentials from task prompt configuration.
- Add prompt/version history.
- Add test fixtures and structured output schemas.
- Add human approval steps for risky actions.

Priority: High because this matches the current AI growth opportunity.

### MCP Layer

Purpose:
- Let workflows and agents call external tools through a standard tool interface.

Recommended behavior:
- Add MCP as a platform layer, not as a single connector.
- Register MCP servers per workspace.
- Expose MCP tools to Agents and potentially direct MCP task nodes.
- Audit every tool call.

Priority: Medium-high, after RBAC and credential safety.

### Authentication And Role-Based Access

Purpose:
- Make the product safe for multiple users and teams.

Recommended behavior:
- Start with email/password or OAuth login.
- Add organization/workspace membership.
- Add role policies for workflow editing, running, credentials, connectors, admin settings, and logs.
- Add invite flows.

Priority: Critical.

### Multi-Cluster / Distributed Server Management

Purpose:
- Operate multiple execution clusters or worker pools.

Recommended behavior:
- Add worker registration, heartbeats, queue metadata, cluster labels, and capacity views.
- Route executions by tenant, region, priority, or connector requirements.

Priority: Later, after execution idempotency and tenant isolation.

### Database Nodes

Purpose:
- Allow workflows to query and write databases directly.

Recommended behavior:
- Support PostgreSQL, MySQL, MSSQL, and MongoDB through dedicated DB task parameters.
- Use saved database connections.
- Add query timeout, row limits, read-only mode, transaction controls, and secret redaction.
- Add schema browsing and query testing.
- Require stronger permission checks for write queries.

Priority: Medium-high, especially for internal automation use cases.

## Deployment Enhancements

### Kubernetes Deployment

Purpose:
- Prepare the platform for larger production environments.

Recommended behavior:
- Keep Docker Compose for local development.
- Add Kubernetes manifests or Helm chart for production.
- Use Deployments for API, Core, and frontend gateway.
- Use Jobs or init containers for migrations and connector catalog sync.
- Use Secrets for credentials.
- Use ConfigMaps for non-secret config.
- Add readiness and liveness probes.
- Add HorizontalPodAutoscaler for API and Core.
- Support external MongoDB, Redis, and RabbitMQ/queue services.
- Add ingress configuration with TLS.

Priority:
- Medium. Useful soon, but auth, tenancy, and execution reliability are more urgent.

### UI Refresh Banner On Upgrade

Purpose:
- Let users know when a new frontend version is deployed while they are using the app.

Recommended behavior:
- Generate a build version file during frontend build.
- Poll `/version.json` or expose `/rest/health/version`.
- Compare current loaded version with latest deployed version.
- Show a non-blocking banner: "A new version is available. Refresh to update."
- Avoid interrupting users during active workflow editing.
- If there are unsaved changes, warn before refresh.

Priority:
- Medium-high. It is small, visible, and improves production polish.

## UI/UX Roadmap

Goal: make the app feel like a mature workflow product for builders and operators.

Recommended improvements:

- Replace internal/tooling language with outcome-focused labels.
- Use empty, loading, and error states consistently.
- Make all integration and credential screens feel like end-user product screens, not admin forms.
- Use progressive disclosure: show essential fields first, advanced fields later.
- Reduce internal IDs in the primary UI.
- Add clearer connector action categories.
- Add command surfaces where users expect them: task header actions, node menu actions, canvas toolbar actions.
- Add inline validation before save and publish.
- Add workflow health indicators.
- Add execution debug panels with input, output, logs, retries, and linked credentials.
- Add reusable design tokens for status, connector, task type, and execution state.
- Review text across the app for maturity, consistency, and confidence.

Specific UI text concerns:

- Avoid labels that feel like implementation details.
- Avoid instructions that shift normalization work to the user, such as "Do not include a trailing slash."
- Avoid showing generated keys before users understand why they matter.
- Prefer "Connection", "Credential", "Action", "Workflow", and "Execution" consistently.
- Use "Reconnect", "Verify connection", "Test action", "Use in workflow", and "View usage" as user-facing commands.

## Issues To Address

### 1. API Failure Shows Empty Screens

Problem:
- Some screens render as empty when the API fails.

Recommended fix:
- Standardize API states in every data-loading page: loading, empty, error, success.
- Empty state should only mean a successful API response with zero results.
- Error state should include retry, support/debug detail, and request correlation ID when available.
- Add E2E tests for API failure on every route.

Priority: Critical UX polish.

### 2. Test Action Placement And Behavior

Problem:
- Test action is basic and appears inline instead of being available as a consistent task command.

Recommended fix:
- Add a "Test" action to every task config header next to duplicate/delete or the relevant node commands.
- Keep the output panel in the config dialog or side panel.
- Test execution should use the same executor path as real execution.
- Test runs should be marked as development/test executions and excluded from production metrics by default.

How to handle variables from previous tasks:
- Maintain per-workflow sample data.
- Let users run previous tasks up to the selected node.
- Let users reuse data from a previous execution.
- Let users pin or mock task outputs during development.
- When required upstream data is missing, show a clear prompt to run upstream tasks, select past execution data, or enter mock data.

Reference behavior:
- n8n supports pinning and mocking data during development, including reusing saved node output instead of repeatedly calling external systems.
- Zapier lets users map fields from previous steps based on sample/test data and can use previous runs as test records.

Recommended model for this platform:
- Add "Run previous steps", "Use last execution data", "Use pinned data", and "Edit mock data" options.
- Store pinned/mock data separately from production execution data.
- Add visual indicators when a test uses pinned or mocked input.

Priority: High.

### 3. Gmail Connection Feels Like Custom Credentials

Problem:
- Gmail asks users to add a connection, but the flow appears like custom credentials rather than a polished prebuilt integration.

Recommended fix:
- Separate "prebuilt app connection" from "custom credential".
- For prebuilt Gmail, show a branded "Connect Gmail" OAuth flow.
- Hide client ID, client secret, token URL, and auth details in the normal flow.
- Support system-managed OAuth app credentials for prebuilt connectors.
- Offer "Use custom OAuth app" only as an advanced option.

Recommended credential model:
- System credential: platform-owned OAuth client/app used by all tenants, subject to platform security and verification.
- Workspace credential: tenant-owned OAuth app or API key configuration.
- User connection: a specific user's authorized account/token for a connector.

Reference behavior:
- Zapier app connections are reusable across workflows and usually use OAuth for modern apps.
- Zapier's OAuth flow keeps the user in a familiar app authorization window and hides most protocol details from normal users.

Priority: High.

### 4. Connector Actions Are Too Sparse

Problem:
- Some connectors have only one or two actions, which makes them feel incomplete.

Recommended fix:
- Define minimum action coverage for each tier-one connector.
- Add common action groups per connector:
  - Search/list records.
  - Get by ID.
  - Create.
  - Update.
  - Delete/archive.
  - Send/post/upload.
  - Trigger/webhook support where applicable.
- Prioritize connectors by likely team value: Gmail, Slack, Google Sheets, GitHub, Jira, Notion, HubSpot, Salesforce, PostgreSQL, MySQL, OpenAI/LLM providers.

Priority: Medium-high.

### 5. Connector Icon Upload

Problem:
- Connector icons currently depend on public icon URLs.

Recommended fix:
- Add icon source options: public URL, uploaded file, generated default icon, or built-in catalog icon.
- Store uploaded icons in object storage or GridFS.
- Validate file type, dimensions, and size.
- Serve icons through the backend or CDN.

Priority: Medium.

### 6. Integration Connector UI Feels Internal

Problem:
- Connector UI currently feels more like an internal admin tool than a mature end-user product.

Recommended fix:
- Split the UI into two experiences:
  - Integration Directory for end users.
  - Connector Builder/Admin for advanced users.
- End users should see app name, description, auth type, available actions, connection status, and connect button.
- Builder/Admin screens can show manifest details, action schemas, base URLs, auth internals, and IDs.
- Replace childish or overly casual labels with concise product language.
- Add preview, verification, action count, last updated, and usage information.

Priority: High for perceived product quality.

### 7. Internal ID / Key Handling

Problem:
- Connector internal IDs are visible too early and may be derived from labels.

Recommended fix:
- Use random or opaque stable IDs for internal records.
- Keep user-facing slugs separate from internal IDs.
- Allow display names to change without breaking workflows.
- Show internal ID only after creation in an advanced details section.
- Validate uniqueness at the API layer, not through user-facing manual key management.

Priority: Medium-high.

### 8. Base URL Trailing Slash Constraint

Problem:
- The UI tells users not to include a trailing slash.

Recommended fix:
- Normalize base URLs in code.
- Trim whitespace.
- Remove trailing slashes.
- Validate protocol and host.
- Preserve path if intentionally configured.
- Show validation errors only for truly invalid URLs.

Priority: Low-medium, but easy polish.

### 9. Connector Actions Only Use HTTP Task Type

Question:
- Are other task types needed inside connector actions?

Recommendation:
- Connector actions should remain mostly HTTP-backed for external API calls.
- Other task types should not be embedded inside a single connector action unless the action is explicitly composite.
- If a connector action needs multiple steps, model it as:
  - A reusable sub workflow.
  - A composite connector action with a controlled internal implementation.
  - An MCP tool call where appropriate.

Why:
- HTTP-backed actions are predictable, versionable, testable, and easy to map to external APIs.
- Full task graphs inside connector actions can blur responsibility between workflow orchestration and connector execution.

Priority: Design decision, not a bug.

## Standardization Checklist

### Backend

- Add auth middleware and tenant context.
- Scope repositories by organization/workspace.
- Add policy checks in services, not only controllers.
- Add workflow state machine.
- Add idempotency for trigger/resume/test.
- Add immutable published workflow versions.
- Add structured audit events.
- Add task retries/timeouts.
- Add rate limiting per connection.
- Add connector manifest versioning.
- Add payload offloading for large task data.

### Frontend

- Standardize loading, empty, error, and success states.
- Add a mature integration directory.
- Split end-user integration connection from connector builder/admin.
- Move test action into task config header.
- Add pinned/mock sample data management.
- Add refresh-on-upgrade banner.
- Hide internal IDs behind advanced sections.
- Improve copy and labels across connector and settings flows.

### DevOps

- Add CI gates before Docker publish.
- Add production smoke tests.
- Add Kubernetes deployment option.
- Add version endpoint and build metadata.
- Add structured logs and correlation IDs.
- Add monitoring dashboards.
- Add backup/restore procedures.
- Add secret rotation procedures.

### Documentation

- Update README to reflect the real React frontend.
- Keep feature coverage concise and current.
- Split product roadmap, technical backlog, and test coverage into separate docs.
- Add architecture decision records for tenancy, workflow versioning, connector credentials, and test execution.

## Suggested Next Implementation Order

1. Standardize API error states in the frontend.
2. Update README and docs to reflect current product capabilities.
3. Refactor integration UI into end-user directory and advanced builder/admin areas.
4. Add proper auth, workspace, and RBAC foundation.
5. Replace default organization placeholders with request-scoped tenant context.
6. Complete workflow draft/publish/version semantics.
7. Rework task testing with upstream data, pinned data, and prior execution data.
8. Add system-managed OAuth credentials for prebuilt connectors.
9. Add per-connection rate limiting.
10. Expand tier-one connector actions.
11. Add sub workflows.
12. Add MCP registry and tool execution.
13. Add Kubernetes deployment.
14. Add distributed worker and multi-cluster management.

## Product Positioning

The product can become useful for teams if it focuses on:

- Easy workflow building.
- Reliable execution.
- Strong integrations.
- Governed AI actions.
- Safe credentials and permissions.
- Clear debugging.
- Mature collaboration.

The winning path is not to clone every automation platform at once. The strongest direction is to become a workflow platform where AI agents, traditional automation, human approvals, and team-safe integrations all work together under one governed execution model.
