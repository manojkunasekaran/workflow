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
* **Use Cases Grid**: Lists all workflows assigned to this integration. Each use case card features a "Use this" CTA.

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

## Out of Scope (Phase 2 & Beyond)
* **Embedded Configuration Portal**: End-user (customer) facing install portal.
* **Instance Mapping**: Multi-tenant credential isolation mapped per integration instance.
* **Strict RBAC**: Deep Auth/RBAC enforcement on standard API users for system integrations vs tenant integrations.
* **Versioning**: Integration version control and backward compatibility tracking.
