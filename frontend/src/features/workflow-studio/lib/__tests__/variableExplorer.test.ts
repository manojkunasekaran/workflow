// Should read the rules before creating/updating the test files
import { describe, it, expect, beforeEach } from 'vitest';
import type { Edge } from '@xyflow/react';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import {
    getAncestorTaskNodes,
    isInsideIteratorLoop,
    buildVariableSources,
    buildExpression,
    isExpression,
    getGlobalInputSource,
    getGlobalVariablesSource,
    LOOP_ITEM_SOURCE,
} from '../variableExplorer';
import { WORKFLOW_START_ID } from '@/features/workflow-studio/constants/studioCanvas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTaskNode(
    id: string,
    type: string,
    parameters: Record<string, unknown> = {},
): StudioCanvasNode {
    return {
        id,
        type: 'task',
        position: { x: 0, y: 0 },
        draggable: true,
        data: { taskId: id, type, parameters },
    } as StudioCanvasNode;
}

function makeStartNode(): StudioCanvasNode {
    return {
        id: WORKFLOW_START_ID,
        type: 'start',
        position: { x: 0, y: 0 },
        draggable: true,
        data: { label: 'Start' },
    } as StudioCanvasNode;
}

function makeMainEdge(source: string, target: string): Edge {
    return {
        id: `${source}->${target}`,
        source,
        target,
        sourceHandle: 'main-out',
        targetHandle: 'main-in',
    };
}

function makeBranchChainEdge(source: string, target: string): Edge {
    return {
        id: `branch-chain:${source}->${target}`,
        source,
        target,
        sourceHandle: 'main-out',
        targetHandle: 'main-in',
    };
}

// ─── getAncestorTaskNodes ─────────────────────────────────────────────────────

describe('getAncestorTaskNodes', () => {
    // Happy path: linear chain  Start → A → B → C
    it('returns ancestors in a simple linear chain', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('task_a', 'HTTP_TASK'),
            makeTaskNode('task_b', 'HTTP_TASK'),
            makeTaskNode('task_c', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'task_a'),
            makeMainEdge('task_a', 'task_b'),
            makeMainEdge('task_b', 'task_c'),
        ];

        const ancestors = getAncestorTaskNodes('task_c', nodes, edges);
        const ids = ancestors.map((n) => n.id);

        expect(ids).toContain('task_a');
        expect(ids).toContain('task_b');
        // Must NOT contain task_c itself
        expect(ids).not.toContain('task_c');
    });

    // Happy path: task with no incoming edges has no ancestors
    it('returns empty array for the first task after Start', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('task_a', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [makeMainEdge(WORKFLOW_START_ID, 'task_a')];

        const ancestors = getAncestorTaskNodes('task_a', nodes, edges);
        expect(ancestors).toHaveLength(0);
    });

    // Negative: no nodes, no edges
    it('returns empty array when there are no nodes or edges', () => {
        const ancestors = getAncestorTaskNodes('task_x', [], []);
        expect(ancestors).toHaveLength(0);
    });

    // Edge: branch isolation — task in Branch-A cannot see tasks in Branch-B
    it('does not include tasks from sibling branches', () => {
        /**
         * Layout:
         *   Start → branch_task
         *   branch_task (par-0) → branch_a_task
         *   branch_task (par-1) → branch_b_task
         *   branch_a_task → target_task (we're editing target_task)
         */
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('branch_task', 'BRANCH'),
            makeTaskNode('branch_a_task', 'HTTP_TASK'),
            makeTaskNode('branch_b_task', 'HTTP_TASK'),
            makeTaskNode('target_task', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'branch_task'),
            { id: 'route:branch_task->branch_a_task', source: 'branch_task', target: 'branch_a_task', sourceHandle: 'par-0', targetHandle: 'main-in' },
            { id: 'route:branch_task->branch_b_task', source: 'branch_task', target: 'branch_b_task', sourceHandle: 'par-1', targetHandle: 'main-in' },
            makeBranchChainEdge('branch_a_task', 'target_task'),
        ];

        const ancestors = getAncestorTaskNodes('target_task', nodes, edges);
        const ids = ancestors.map((n) => n.id);

        // Should see branch_task (the parent) and branch_a_task (direct predecessor)
        expect(ids).toContain('branch_task');
        expect(ids).toContain('branch_a_task');
        // Should NOT see branch_b_task (in a sibling branch)
        expect(ids).not.toContain('branch_b_task');
    });

    // Edge: JOIN aggregates all branches
    it('includes tasks from all branches when querying after a JOIN', () => {
        /**
         *   Start → branch_task
         *   branch_task (par-0) → branch_a_task
         *   branch_task (par-1) → branch_b_task
         *   branch_a_task + branch_b_task → join_task
         *   join_task → after_join_task
         */
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('branch_task', 'BRANCH'),
            makeTaskNode('branch_a_task', 'HTTP_TASK'),
            makeTaskNode('branch_b_task', 'HTTP_TASK'),
            makeTaskNode('join_task', 'JOIN'),
            makeTaskNode('after_join_task', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'branch_task'),
            { id: 'route:branch_task->branch_a_task', source: 'branch_task', target: 'branch_a_task', sourceHandle: 'par-0', targetHandle: 'main-in' },
            { id: 'route:branch_task->branch_b_task', source: 'branch_task', target: 'branch_b_task', sourceHandle: 'par-1', targetHandle: 'main-in' },
            { id: 'join-merge-a', source: 'branch_a_task', target: 'join_task', sourceHandle: 'main-out', targetHandle: 'join-merge' },
            { id: 'join-merge-b', source: 'branch_b_task', target: 'join_task', sourceHandle: 'main-out', targetHandle: 'join-merge' },
            makeMainEdge('join_task', 'after_join_task'),
        ];

        const ancestors = getAncestorTaskNodes('after_join_task', nodes, edges);
        const ids = ancestors.map((n) => n.id);

        expect(ids).toContain('branch_task');
        expect(ids).toContain('branch_a_task');
        expect(ids).toContain('branch_b_task');
        expect(ids).toContain('join_task');
    });
});

// ─── isInsideIteratorLoop ─────────────────────────────────────────────────────

describe('isInsideIteratorLoop', () => {
    // Happy path: a loop body task is correctly detected
    it('returns true for a task that is inside an iterator loop body', () => {
        const loopBody1 = makeTaskNode('loop_action_1', 'HTTP_TASK');
        const iteratorNode = makeTaskNode('loop_task', 'ITERATOR_TASK', {
            loopBodyStartTaskId: 'loop_action_1',
        });
        const nodes: StudioCanvasNode[] = [makeStartNode(), iteratorNode, loopBody1];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'loop_task'),
            makeBranchChainEdge('loop_action_1', 'loop_action_2'),
        ];

        expect(isInsideIteratorLoop('loop_action_1', nodes, edges)).toBe(true);
    });

    // Negative: a task on the main spine is not inside a loop
    it('returns false for a main-chain task not inside a loop', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('loop_task', 'ITERATOR_TASK', { loopBodyStartTaskId: 'loop_action_1' }),
            makeTaskNode('after_loop', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'loop_task'),
            makeMainEdge('loop_task', 'after_loop'),
        ];

        expect(isInsideIteratorLoop('after_loop', nodes, edges)).toBe(false);
    });

    // Edge: no iterator tasks in the workflow
    it('returns false when there are no ITERATOR_TASK nodes', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('task_a', 'HTTP_TASK'),
        ];
        expect(isInsideIteratorLoop('task_a', nodes, [])).toBe(false);
    });
});

// ─── buildVariableSources ─────────────────────────────────────────────────────

describe('buildVariableSources', () => {
    // Happy path: always includes global sources
    it('always includes $input and $variables global sources', () => {
        const nodes: StudioCanvasNode[] = [makeStartNode(), makeTaskNode('task_a', 'HTTP_TASK')];
        const edges: Edge[] = [makeMainEdge(WORKFLOW_START_ID, 'task_a')];
        const sources = buildVariableSources('task_a', nodes, edges);
        const scopes = sources.map((s) => s.scope);
        expect(scopes).toContain('$input');
        expect(scopes).toContain('$variables');
        
        // Assert the default fallback schema is used when no inputs/variables provided
        const inputSource = sources.find(s => s.scope === '$input');
        expect(inputSource?.schema['*']).toBeDefined();
    });

    it('dynamically maps definition inputs and variables to schema', () => {
        const nodes: StudioCanvasNode[] = [makeStartNode(), makeTaskNode('task_a', 'HTTP_TASK')];
        const edges: Edge[] = [makeMainEdge(WORKFLOW_START_ID, 'task_a')];
        const inputs = [{ name: 'userId', type: 'string' as const, description: 'The ID' }];
        const variables = { 'apiKey': { name: 'apiKey', type: 'string' as const, value: '123' } };
        
        const sources = buildVariableSources('task_a', nodes, edges, inputs, variables);
        
        const inputSource = sources.find(s => s.scope === '$input');
        expect(inputSource?.schema['userId']).toBeDefined();
        expect(inputSource?.schema['userId'].type).toBe('string');
        
        const variableSource = sources.find(s => s.scope === '$variables');
        expect(variableSource?.schema['apiKey']).toBeDefined();
    });

    // Happy path: ancestor task appears as a source
    it('includes an ancestor task as a variable source', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('task_a', 'HTTP_TASK'),
            makeTaskNode('task_b', 'SCRIPT_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'task_a'),
            makeMainEdge('task_a', 'task_b'),
        ];

        const sources = buildVariableSources('task_b', nodes, edges);
        const scopes = sources.map((s) => s.scope);
        expect(scopes).toContain('$tasks.task_a');
        expect(scopes).not.toContain('$tasks.task_b');
    });

    // Happy path: loop context injected when inside an iterator
    it('includes $loop source when the task is inside an iterator loop', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('loop_task', 'ITERATOR_TASK', { loopBodyStartTaskId: 'loop_action_1' }),
            makeTaskNode('loop_action_1', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [
            makeMainEdge(WORKFLOW_START_ID, 'loop_task'),
        ];

        const sources = buildVariableSources('loop_action_1', nodes, edges);
        const scopes = sources.map((s) => s.scope);
        expect(scopes).toContain('$loop');
    });

    // Negative: no $loop source for tasks outside a loop
    it('does not include $loop source for main-chain tasks', () => {
        const nodes: StudioCanvasNode[] = [
            makeStartNode(),
            makeTaskNode('task_a', 'HTTP_TASK'),
        ];
        const edges: Edge[] = [makeMainEdge(WORKFLOW_START_ID, 'task_a')];

        const sources = buildVariableSources('task_a', nodes, edges);
        const scopes = sources.map((s) => s.scope);
        expect(scopes).not.toContain('$loop');
    });

    // Edge: global sources are always the first items in the list
    it('places global sources at the beginning of the list', () => {
        const nodes: StudioCanvasNode[] = [makeStartNode(), makeTaskNode('task_a', 'HTTP_TASK')];
        const edges: Edge[] = [makeMainEdge(WORKFLOW_START_ID, 'task_a')];

        const sources = buildVariableSources('task_a', nodes, edges);
        expect(sources[0].scope).toBe('$input');
        expect(sources[1].scope).toBe('$variables');
    });
});

// ─── buildExpression ──────────────────────────────────────────────────────────

describe('buildExpression', () => {
    // Happy path
    it('builds a scoped expression without property', () => {
        expect(buildExpression('$input')).toBe('{{$input}}');
    });

    it('builds an expression with a property path', () => {
        expect(buildExpression('$tasks.http_1', 'body.id')).toBe('{{$tasks.http_1.body.id}}');
    });

    // Edge: nested property with multiple dots
    it('handles deeply nested property paths', () => {
        expect(buildExpression('$tasks.api_call', 'body.user.email')).toBe(
            '{{$tasks.api_call.body.user.email}}',
        );
    });
});

// ─── isExpression ─────────────────────────────────────────────────────────────

describe('isExpression', () => {
    // Happy path
    it('returns true for a valid template expression', () => {
        expect(isExpression('{{$input.name}}')).toBe(true);
    });

    it('returns true when expression is embedded in text', () => {
        expect(isExpression('Hello {{$input.name}}')).toBe(true);
    });

    // Negative
    it('returns false for plain text with no expression', () => {
        expect(isExpression('hello world')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isExpression('')).toBe(false);
    });

    // Edge
    it('returns false for unclosed braces', () => {
        expect(isExpression('{{$input.name')).toBe(false);
    });
});
