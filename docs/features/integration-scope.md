# Integrations Feature Scope

## Overview
The Integrations feature introduces a new abstraction layer to the workflow platform. An **Integration** represents a named pairing of a Source App and a Destination App (e.g., "Gmail → Salesforce"), which acts as a container for one or more published **Workflows** (referred to as "Use Cases"). 

This allows the platform to present pre-built integrations similarly to platforms like Zapier, moving from isolated developer workflows to discoverable, publishable integration products.

## Domain Model
* **Integration Entity**:
  * `name`: Display name (e.g., "Gmail to Salesforce").
  * `description`: Overview of the integration.
  * `sourceConnectorId` & `destinationConnectorId`: References to the underlying Connector Manifests.
  * `scope`: `SYSTEM` (Admin-published, available to all) or `USER` (User-created, private).
  * `status`: `DRAFT`, `PUBLISHED`, or `DEPRECATED`.
  * `tags`: Categorization tags for search.
* **Use Case (Workflow Extension)**:
  * Workflows (`WorkflowDefinition`) are extended to link to an Integration.
  * Added fields: `integrationId`, `useCaseTitle`, `useCaseDescription`.

## Frontend Architecture & UX

### 1. Integrations Directory (`/integrations`)
* **Discovery Hub**: A new top-level navigation section (Puzzle icon in sidebar).
* **Tabs & Filtering**: Filter by "All", "System" (Admin published), and "My Integrations" (User created). Includes text search.
* **Cards**: Displays the Source/Destination connector icons, integration name, description, status/scope badges, and the number of active use cases.
* **Create Flow**: Modal to select Source App and Destination App to initialize a `DRAFT` integration.

### 2. Integration Detail Page (`/integrations/:id`)
* **Header**: Displays integration metadata and lifecycle action buttons (`Publish`, `Deprecate`) based on the current status.
* **Tabs**: **Use Cases** and **Insights**.
* **Use Cases Grid**: Lists all workflows assigned to this integration. Each use case card features a "Use this" CTA.
* **Insights**: Summary KPIs (total runs, success rate, failed runs, use case count) and a per–use-case breakdown table. **View insights** opens a side panel with use-case metrics and the 10 most recent runs (links to execution detail). Counts are derived from `WorkflowExecution` records for assigned workflows; studio test runs (`targetTaskId` set) are excluded.
* **Workflow Studio**: When a workflow is assigned to an integration, **View use case insights** is available from the header menu (⋮).

### 3. Workflow Studio Extension
* **Assign to Integration**: A new action (Puzzle icon) in the Studio Header.
* **Dialog**: Allows the workflow creator to link the current workflow to an existing integration, defining its `useCaseTitle` and `useCaseDescription`. 
* **Save Flow**: Assignment metadata is merged into the workflow's definition and saved alongside the standard workflow graph via the existing `markDirty()` and save mechanics.

## Backend Architecture

* **New Endpoints (`IntegrationController`)**:
  * `POST /integrations` - Create a new Integration (defaults to DRAFT).
  * `GET /integrations` - List all accessible integrations.
  * `GET /integrations/{id}` - Get integration details (enriched with connector names/icons and use case count).
  * `PUT /integrations/{id}` - Update metadata.
  * `DELETE /integrations/{id}` - Delete a DRAFT integration.
  * `POST /integrations/{id}/publish` - Publish an integration.
  * `POST /integrations/{id}/deprecate` - Deprecate an integration.
  * `POST /integrations/{id}/use-cases` - Assign a workflow to an integration.
  * `DELETE /integrations/{id}/use-cases/{workflowId}` - Remove a workflow from an integration.
  * `GET /integrations/{id}/insights` - Run volume and reliability metrics for the integration and each use case.
  * `GET /integrations/{id}/use-cases/{workflowId}/insights` - Metrics and recent runs for a single use case (side panel in UI).
  * `GET /integrations/{id}/insights/export` - CSV export of integration summary and per–use-case metrics (UTF-8 with BOM).
  * `GET /integrations/{id}/use-cases/{workflowId}/insights/export` - CSV for one use case (summary row + up to 10 recent runs).
  * `POST /integrations/{id}/insights/retry-failed` - Re-queue failed executions (optional `workflowDefinitionId` to scope to one use case; bounded batch, most recent first; same trigger inputs as each failed run).
* **Insights UI**: Integration tab actions apply to the whole integration; the use-case insights side panel has **Export** and **Retry failed** scoped to that workflow.

## Insights — future (not implemented)
* Event stream and dedicated analytics store for trends and date-range reporting.
* Pre-aggregated counters or scheduled rollups at high volume.
* Scheduled **Reports** (export/PDF) and embedded observability dashboards.
* Denormalized `integrationId` on executions for cross-cutting queries without joining definitions.

## Out of Scope (Phase 2 & Beyond)
* **Embedded Configuration Portal**: End-user (customer) facing install portal.
* **Instance Mapping**: Multi-tenant credential isolation mapped per integration instance.
* **Strict RBAC**: Deep Auth/RBAC enforcement on standard API users for system integrations vs tenant integrations.
* **Versioning**: Integration version control and backward compatibility tracking.
