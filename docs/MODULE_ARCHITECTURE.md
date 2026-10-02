# Module Architecture

Hierarchical layout for reusable capability modules, workflow engine, and ingress services.

## Layers

```
L0 foundation   modules/common, crypto, persistence, messaging, execution-events
L1 capability   backend/modules/capability/*  (engine-agnostic reusable libs)
L2 engine       services/core         (WorkflowEngine, orchestration — future split)
L3 task         future task-* modules (thin TaskExecutor adapters)
L4 ingress      services/api          (REST, webhooks, inbound MCP servlet)
```

Dependencies point downward. Capability modules must not depend on `api`, `core`, or `engine`.

## Phase 1 (implemented)

| Module | Path | Package |
|--------|------|---------|
| MCP outbound client | `backend/modules/capability/mcp` | `com.app.capability.mcp.api` (public), `transport`, `auth`, `spring` |
| Layer arch tests | `backend/tests` | ArchUnit rules in `src/test/java` |

Maven artifactId remains **`mcp`** (same as before). Layer is visible from path `modules/capability/mcp/`.

Inbound MCP Streamable HTTP stays in `services/api` until a future `protocol/mcp-server` module.

## Build

```bash
# Dev libs (docker compose)
docker compose run --rm build-libs

# Or manually
mvn -N install -DskipTests
mvn -f modules/pom.xml install -DskipTests
```

Prod Dockerfiles build `modules/` (including `modules/capability/*`) before packaging `services/api` or `services/core`.

## Deferred

- `foundation/` folder rename for L0 modules
- `engine-*` split from `services/core`
- `task-*` thin executors
- `protocol/mcp-server` (move inbound servlet out of api)
- `capability-spi` / CapabilityRegistry
- Additional capabilities: `transform`, `http`, `llm`
