# Breaking Change: Generic BRANCH / JOIN Model

This release removes the coupled BRANCH↔JOIN pairing model. Workflows must be rebuilt in Workflow Studio.

## Removed fields (no migration)

| Task | Removed field | Replacement |
|------|---------------|-------------|
| BRANCH | `joinTaskId` | Wire branch path tips to JOIN `join-merge` |
| BRANCH | `branches[].endTaskId` | Topology resolver computes tips from canvas wiring |
| JOIN | `branchTaskId` | `inboundTaskIds` — explicit fan-in list |

Stored definitions containing these fields fail validation at save/load with an explicit field error.

## New JOIN model

| Field | Purpose |
|-------|---------|
| `inboundTaskIds` | Ordered list of tasks wired into `join-merge` |
| `waitPolicy` | `ALL`, `ANY`, or `QUORUM` |
| `quorumCount` | Required when `waitPolicy` is `QUORUM` |
| `failureStrategy` | `FAIL_FAST`, `WAIT_FOR_ALL`, `REQUIRE_ALL` |
| `mergeMode` | `PASS_THROUGH` (flat merge) or `COLLECT_OUTPUTS` (keyed by inbound) |
| `barrierTimeoutMs` | Optional per-JOIN wait timeout |
| `nextTaskId` | Continuation after barrier is satisfied |

## Behavior changes

- BRANCH only spawns parallel paths; it no longer references a JOIN.
- JOIN waits for configured inbounds per `waitPolicy`, including paths not spawned by a BRANCH.
- Nested BRANCH paths can converge on a single JOIN (`inboundTaskIds` lists tips from all paths).
- Topology is authoritative: `inboundTaskIds` must match canvas wires. No load-time repair or normalization.

## No migration tooling

There is no automatic upgrade path. Export or recreate workflows manually using the new wiring model.
