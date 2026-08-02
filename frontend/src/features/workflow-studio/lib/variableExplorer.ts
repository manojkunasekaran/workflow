/**
 * variableExplorer.ts
 *
 * Graph-aware variable resolution for the "Expression" mode of task config fields.
 *
 * Given the current task's nodeId, this module:
 *  1. Walks the React Flow edges BACKWARDS (BFS from target→source) to collect every
 *     ancestor node that is guaranteed to have executed before the current task.
 *  2. Respects nested flows:
 *     - ITERATOR loop bodies inherit the loop's $item / $index context.
 *     - BRANCH paths only expose their own ancestors (BFS naturally handles isolation).
 *     - JOIN nodes aggregate all converging branches.
 *  3. Returns a list of VariableSource objects for the DataExplorer component.
 */

import type { Edge } from '@xyflow/react';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { getTaskNodes } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { WORKFLOW_START_ID } from '@/features/workflow-studio/constants/studioCanvas';
import type { WorkflowInput, VariableValue, VariableType } from '@/types/api';

// ─── Variable Schema Types ────────────────────────────────────────────────────

export type VariableSchemaLeaf = 'string' | 'number' | 'boolean' | 'any' | 'object' | 'array';

export interface VariableSchemaNode {
    type: VariableSchemaLeaf;
    label?: string;
    children?: Record<string, VariableSchemaNode>;
}

export interface VariableSource {
    /** Unique key prefix used in template expressions, e.g. "$tasks.http_task_1" */
    scope: string;
    /** Human-readable label shown in the Data Explorer */
    label: string;
    /** Optional extra label suffix (e.g. task type name) */
    sublabel?: string;
    /** Whether this is a special global scope ($input, $variables, $loop) */
    isGlobal?: boolean;
    /** Expandable property tree */
    schema: Record<string, VariableSchemaNode>;
}

// ─── Static Task Output Schemas ───────────────────────────────────────────────

/**
 * Maps a task type to the static output schema we can advertise to the user.
 * These are the properties accessible via `{{$tasks.<taskId>.<key>}}`.
 *
 * We ship conservative / accurate schemas. "any" means the shape is
 * runtime-determined (e.g. HTTP body).
 */
const TASK_OUTPUT_SCHEMAS: Record<string, Record<string, VariableSchemaNode>> = {
    HTTP_TASK: {
        status: { type: 'number', label: 'HTTP status code' },
        statusText: { type: 'string', label: 'Status text' },
        headers: { type: 'object', label: 'Response headers' },
        body: {
            type: 'any',
            label: 'Response body',
        },
    },
    SCRIPT_TASK: {
        result: { type: 'any', label: 'Script return value' },
        output: { type: 'string', label: 'Console output' },
    },
    DATA_TRANSFORM: {
        result: { type: 'any', label: 'Transformed result' },
        operation: { type: 'string', label: 'Operation used' },
    },
    CONDITIONAL: {
        matchedBranch: { type: 'string', label: 'Matched branch name' },
    },
    ITERATOR_TASK: {
        totalIterations: { type: 'number', label: 'Total iterations' },
        completedIterations: { type: 'number', label: 'Completed iterations' },
        failedIterations: { type: 'number', label: 'Failed iterations' },
        results: { type: 'array', label: 'All iteration results' },
    },
    HUMAN_TASK: {
        response: { type: 'object', label: 'Human response payload' },
        action: { type: 'string', label: 'Action chosen (e.g. Approved)' },
        respondedBy: { type: 'string', label: 'Responder ID' },
    },
    BRANCH: {
        branches: { type: 'object', label: 'Branch execution states' },
    },
    JOIN: {
        results: { type: 'object', label: 'Collected branch results' },
        status: { type: 'string', label: 'Overall join status' },
    },
    WAIT: {
        waited: { type: 'number', label: 'Actual wait duration (ms)' },
    },
};

function schemaForTaskType(type: string): Record<string, VariableSchemaNode> {
    return TASK_OUTPUT_SCHEMAS[type] ?? { result: { type: 'any', label: 'Task output' } };
}

// ─── Global Scope Sources ─────────────────────────────────────────────────────

export function getGlobalInputSource(inputs?: WorkflowInput[]): VariableSource {
    const schema: Record<string, VariableSchemaNode> = {};
    if (inputs && inputs.length > 0) {
        for (const input of inputs) {
            schema[input.name] = {
                type: mapApiTypeToLeaf(input.type),
                label: input.description || 'Trigger Input',
            };
        }
    } else {
        schema['*'] = { type: 'any', label: 'Any trigger property' };
    }

    return {
        scope: '$input',
        label: 'Trigger Input',
        sublabel: 'Workflow trigger data',
        isGlobal: true,
        schema,
    };
}

export function getGlobalVariablesSource(variables?: Record<string, VariableValue>): VariableSource {
    const schema: Record<string, VariableSchemaNode> = {};
    if (variables && Object.keys(variables).length > 0) {
        for (const [key, variable] of Object.entries(variables)) {
            schema[key] = {
                type: mapApiTypeToLeaf(variable.type),
                label: 'Workflow Variable',
            };
        }
    } else {
        schema['*'] = { type: 'any', label: 'Any workflow variable' };
    }

    return {
        scope: '$variables',
        label: 'Workflow Variables',
        sublabel: 'Defined in workflow settings',
        isGlobal: true,
        schema,
    };
}

function mapApiTypeToLeaf(type: VariableType): VariableSchemaLeaf {
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'object' || type === 'array') {
        return type;
    }
    return 'any';
}

/** Injected when the current task is inside an ITERATOR_TASK loop body. */
export const LOOP_ITEM_SOURCE: VariableSource = {
    scope: '$loop',
    label: 'Current Loop Item',
    sublabel: 'Available inside a Loop task body',
    isGlobal: true,
    schema: {
        item: { type: 'any', label: 'Current iteration value' },
        index: { type: 'number', label: 'Zero-based iteration index' },
        key: { type: 'string', label: 'Key (when looping over an object)' },
    },
};

// ─── Graph Traversal (BFS Backwards) ─────────────────────────────────────────

/**
 * Find all task nodes that are guaranteed ancestors of `targetNodeId`
 * by walking edges backwards (from target → source).
 *
 * Rules:
 * - Start at `targetNodeId`, enqueue its incoming edge sources.
 * - Never visit the same node twice.
 * - Stop at WORKFLOW_START_ID (not a task).
 * - Returns ancestors in "discovery" order (closest first).
 *
 * This inherently handles:
 * - BRANCH isolation: BFS only follows edges that actually connect to the target.
 * - JOIN convergence: all branches leading into a JOIN are included.
 * - Iterator loop bodies: loop-body nodes have branch-chain edges from the iterator
 *   node, so BFS naturally reaches the ITERATOR_TASK as their parent.
 */
export function getAncestorTaskNodes(
    targetNodeId: string,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): StudioCanvasNode[] {
    const taskNodeById = new Map(
        getTaskNodes(nodes).map((node) => [node.id, node]),
    );

    const visited = new Set<string>();
    const queue: string[] = [targetNodeId];
    const ancestors: StudioCanvasNode[] = [];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        // Collect all edges whose TARGET is `current`
        for (const edge of edges) {
            if (edge.target !== current) continue;
            const sourceId = edge.source;
            if (!sourceId || visited.has(sourceId) || sourceId === WORKFLOW_START_ID) continue;
            if (!queue.includes(sourceId)) {
                queue.push(sourceId);
            }
        }

        // Add to ancestors (skip the target itself)
        if (current !== targetNodeId) {
            const node = taskNodeById.get(current);
            if (node) ancestors.push(node);
        }
    }

    return ancestors;
}

/**
 * Determine if `nodeId` is a direct child of an ITERATOR_TASK loop body.
 * If so, $loop context ($loop.item, $loop.index) is available.
 */
export function isInsideIteratorLoop(
    nodeId: string,
    nodes: StudioCanvasNode[],
    edges: Edge[],
): boolean {
    for (const node of getTaskNodes(nodes)) {
        if ((node.data as TaskNodeData).type !== 'ITERATOR_TASK') continue;

        // The iterator loop body start is stored as loopBodyStartTaskId in parameters.
        // Any task reachable via branch-chain edges FROM the iterator loop start is a body node.
        const params = (node.data as TaskNodeData).parameters;
        const loopStartId = String(params?.loopBodyStartTaskId ?? '').trim();
        if (!loopStartId) continue;

        // Walk the loop chain to see if nodeId is in it
        let current: string | undefined = loopStartId;
        const visited = new Set<string>();
        while (current && !visited.has(current)) {
            if (current === nodeId) return true;
            visited.add(current);
            const nextEdge = edges.find(
                (edge) =>
                    edge.source === current &&
                    edge.id.startsWith('branch-chain:'),
            );
            current = nextEdge?.target;
        }
    }
    return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the full list of VariableSources available to the task at `currentNodeId`.
 * Always includes global sources ($input, $variables).
 * Includes $loop when inside an iterator loop body.
 * Includes one source per ancestor task node.
 */
export function buildVariableSources(
    currentNodeId: string,
    nodes: StudioCanvasNode[],
    edges: Edge[],
    inputs?: WorkflowInput[],
    variables?: Record<string, VariableValue>,
): VariableSource[] {
    const sources: VariableSource[] = [
        getGlobalInputSource(inputs),
        getGlobalVariablesSource(variables),
    ];

    if (isInsideIteratorLoop(currentNodeId, nodes, edges)) {
        sources.push(LOOP_ITEM_SOURCE);
    }

    const ancestors = getAncestorTaskNodes(currentNodeId, nodes, edges);
    for (const ancestorNode of ancestors) {
        const data = ancestorNode.data as TaskNodeData;
        sources.push({
            scope: `$tasks.${data.taskId}`,
            label: data.displayName ?? data.taskId,
            sublabel: data.type.replace(/_/g, ' '),
            schema: schemaForTaskType(data.type),
        });
    }

    return sources;
}

/**
 * Build the template expression string for a given variable path.
 * e.g. buildExpression('$tasks.http_1', 'body') → '{{$tasks.http_1.body}}'
 */
export function buildExpression(scope: string, propertyPath?: string): string {
    const path = propertyPath ? `${scope}.${propertyPath}` : scope;
    return `{{${path}}}`;
}

/**
 * Check if a string value is already an expression (`{{...}}`).
 */
export function isExpression(value: string): boolean {
    return /\{\{.+?\}\}/.test(value.trim());
}
