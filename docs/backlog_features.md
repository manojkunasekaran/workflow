# Backlog Features

This document tracks technical debt, future enhancements, and planned architectural features that are not part of the current active development cycle.

## 1. Network & Resiliency (RestTemplate Enhancements)

- **Connection Pooling**: Implement Apache HttpClient or OkHttp under RestTemplate to handle heavy concurrency and avoid socket exhaustion.
- **Retry Policies**: Integrate Spring Retry for transient network failures (e.g., 502 Bad Gateway, timeouts).
- **Circuit Breaker**: Add Resilience4J circuit breakers around external API integrations to fail fast when downstream systems are unavailable.
- **Rate Limiting**: Implement token bucket or leaky bucket rate limiting for outgoing requests to external APIs that have hard limits.

## 2. Platform Architecture

- **Multi-Tenancy Framework**: Leverage the existing `Organization` entity to implement true multi-tenant data isolation.
  - Implement tenant context filters (ThreadLocal or Reactor Context).
  - Add `@TenantId` or equivalent partitioning logic in MongoDB.
  - Secure API endpoints to prevent cross-tenant access.

## 3. Storage & Analytics

- **Task Payload Offloading**: Move large request/response payloads out of main `WorkflowExecution` MongoDB documents and into S3/GridFS to prevent hitting the 16MB document size limit on deeply nested or data-heavy workflows.

## 4. Workflow Resume & Idempotency

- **Idempotent Resume**: Add a unique `resumeToken` to each resume message. Store processed tokens in MongoDB to prevent duplicate resume processing (at-least-once → effectively-once).
- **State Machine Enforcement**: Implement a proper state machine for `WorkflowExecutionStatus` transitions (e.g., `QUEUED → RUNNING`, `RUNNING → PAUSED`, `PAUSED → RUNNING`). Reject invalid transitions at the engine level.
- **Checkpoint-Based Persistence**: Save execution state at each task boundary (current task ID, context snapshot) so that resume can pick up from the exact checkpoint, even after a crash.
- **Distributed Locking**: Use MongoDB's `findAndModify` or Redis distributed locks to prevent concurrent resume attempts on the same execution.

## 5. Execution Auditing & Event Sourcing

- **Event Log**: Emit domain events (e.g., `WorkflowTriggered`, `TaskStarted`, `TaskCompleted`, `WorkflowPaused`, `WorkflowResumed`, `WorkflowFailed`) to a dedicated Kafka topic (`workflow.events`).
- **Audit Trail**: Build an append-only audit log collection in MongoDB from consumed events, providing a full timeline for each execution.
- **Event Replay**: Enable replaying events for debugging, post-mortem analysis, and rebuilding read models.
- **Metrics & Observability**: Consume events to build real-time dashboards (execution throughput, failure rates, p95 task durations).

## 6. Workflow Versioning & Rollback

- **Immutable Definitions**: Once a `WorkflowDefinition` is used by any execution, it becomes immutable. New changes create a new version.
- **Version Field**: Add `version` (auto-incrementing integer) and `status` (`DRAFT`, `PUBLISHED`, `DEPRECATED`) to `WorkflowDefinition`.
- **Execution Pinning**: Each `WorkflowExecution` records the exact `definitionVersion` it was triggered with, ensuring running workflows are never affected by definition changes.
- **Rollback Support**: Allow reverting to a previous published version. Only one version can be `PUBLISHED` at a time per workflow.
- **Migration Support**: For long-running paused workflows, provide migration utilities to upgrade the execution context to a newer definition version if compatible.

## 7. Infrastructure Resilience

- **gRPC Timeout Strategy**: Replace fixed timeouts with operation-specific configurable deadlines (e.g., trigger=30s, humanTask=10s). Add retry with exponential backoff via Spring Retry or Resilience4J.
- **Kafka Connection Resilience**: Configure Spring Kafka's built-in retry-on-startup (`spring.kafka.listener.missing-topics-fatal=false`, `spring.kafka.admin.fail-fast=false`) so services can start without Kafka and reconnect when available.
- **Service Startup Decoupling**: Remove hard `depends_on` constraints in Docker Compose. Use Spring Boot's retry/reconnect mechanisms so services start independently and self-heal connections.
- **Health Checks**: Add Kafka connectivity to Spring Boot Actuator health endpoints (`management.health.kafka.enabled=true`).
