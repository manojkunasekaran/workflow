import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { MAIN_IN } from '@/features/workflow-studio/lib/graphHandles';
import {
    applyGraphConnection,
    mergeDisplayEdges,
} from '@/features/workflow-studio/lib/pluginWiringRuntime';
import {
    buildWorkflowGraphFromCanvas,
    buildWorkflowGraphFromContract,
    isValidBranchForkTarget,
    resolveBranchForkWires,
} from '@/features/workflow-studio/lib/workflowTopology';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';

function taskNode(
    taskId: string,
    type: string,
    parameters: Record<string, unknown> = {},
): StudioCanvasNode {
    return {
        id: taskId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
            taskId,
            type,
            displayName: taskId,
            parameters: injectParameterType(type, parameters),
        } as TaskNodeData,
    };
}

const nestedCrossPathGraph = {
    tasks: {
        outer: {
            type: 'BRANCH',
            parameters: {
                branches: [
                    { branchName: 'Path 1', startTaskId: 'http' },
                    { branchName: 'Path 2', startTaskId: 'wait2' },
                    { branchName: 'Path 3', startTaskId: 'script' },
                ],
            },
        },
        inner: {
            type: 'BRANCH',
            parameters: {
                branches: [
                    { branchName: 'Branch 1', startTaskId: 'transform' },
                    { branchName: 'Branch 2', startTaskId: 'wait3' },
                ],
            },
        },
        http: { type: 'HTTP_TASK', parameters: {} },
        transform: { type: 'DATA_TRANSFORM', parameters: {} },
        wait2: { type: 'WAIT', parameters: { duration: 1000 } },
        wait3: { type: 'WAIT', parameters: { duration: 1000 } },
        script: { type: 'SCRIPT', parameters: {} },
        join1: {
            type: 'JOIN',
            parameters: {
                inboundTaskIds: ['transform', 'wait3'],
                waitPolicy: 'ALL',
                mergeMode: 'PASS_THROUGH',
            },
        },
    },
    chainOut: {
        http: 'inner',
        wait2: 'wait3',
        script: 'wait3',
    },
    joinInbounds: {
        join1: ['transform', 'wait3'],
    },
};

describe('workflowTopology — BRANCH fork wires', () => {
    const graph = buildWorkflowGraphFromContract(nestedCrossPathGraph);

    it('resolveBranchForkWires includes nested cross-path fork to Wait 3', () => {
        const wires = resolveBranchForkWires(graph);
        expect(wires).toContainEqual(
            expect.objectContaining({
                branchTaskId: 'inner',
                rowIndex: 1,
                targetTaskId: 'wait3',
                label: 'Branch 2',
                sourceHandle: 'par-1',
            }),
        );
    });

    it('isValidBranchForkTarget allows nested split fork to task on another parallel path', () => {
        expect(isValidBranchForkTarget('inner', 'wait3', graph, ['outer'])).toBe(true);
    });

    it('isValidBranchForkTarget rejects fork to main spine', () => {
        expect(isValidBranchForkTarget('inner', 'outer', graph, ['outer'])).toBe(false);
    });

    it('applyGraphConnection + mergeDisplayEdges render nested cross-path fork edge', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('outer', 'BRANCH', {
                branches: [
                    { branchName: 'Path 1', startTaskId: 'http' },
                    { branchName: 'Path 2', startTaskId: 'wait2' },
                    { branchName: 'Path 3', startTaskId: 'script' },
                ],
            }),
            taskNode('inner', 'BRANCH', {
                branches: [
                    { branchName: 'Branch 1', startTaskId: 'transform' },
                    { branchName: 'Branch 2', startTaskId: '' },
                ],
            }),
            taskNode('http', 'HTTP_TASK', {}),
            taskNode('transform', 'DATA_TRANSFORM', {}),
            taskNode('wait2', 'WAIT', { duration: 1000 }),
            taskNode('wait3', 'WAIT', { duration: 1000 }),
            taskNode('script', 'SCRIPT', {}),
            taskNode('join1', 'JOIN', {
                inboundTaskIds: ['transform', 'wait3'],
                waitPolicy: 'ALL',
                mergeMode: 'PASS_THROUGH',
            }),
        ];

        const chainEdges: Edge[] = [
            {
                id: 'branch-chain:http->inner',
                source: 'http',
                target: 'inner',
                sourceHandle: 'main-out',
                targetHandle: MAIN_IN,
                type: 'studioChain',
            },
            {
                id: 'branch-chain:wait2->wait3',
                source: 'wait2',
                target: 'wait3',
                sourceHandle: 'main-out',
                targetHandle: MAIN_IN,
                type: 'studioChain',
            },
            {
                id: 'branch-chain:script->wait3',
                source: 'script',
                target: 'wait3',
                sourceHandle: 'main-out',
                targetHandle: MAIN_IN,
                type: 'studioChain',
            },
        ];

        const connected = applyGraphConnection(
            {
                source: 'inner',
                sourceHandle: 'par-1',
                target: 'wait3',
                targetHandle: MAIN_IN,
            },
            nodes,
            chainEdges,
        );

        expect(connected).not.toBeNull();
        const innerNode = connected!.find((node) => node.id === 'inner');
        const branches = innerNode?.data.parameters.branches as Array<{ startTaskId: string }>;
        expect(branches[1]?.startTaskId).toBe('wait3');

        const topologyGraph = buildWorkflowGraphFromCanvas(connected!, chainEdges);
        expect(resolveBranchForkWires(topologyGraph)).toContainEqual(
            expect.objectContaining({
                branchTaskId: 'inner',
                targetTaskId: 'wait3',
            }),
        );

        const merged = mergeDisplayEdges(chainEdges, connected!);
        expect(
            merged.some(
                (edge) =>
                    edge.source === 'inner' &&
                    edge.target === 'wait3' &&
                    edge.sourceHandle === 'par-1' &&
                    edge.data?.label === 'Branch 2',
            ),
        ).toBe(true);
    });

    it('mergeDisplayEdges hides nested fork when config-draft overlay lacks startTaskId', () => {
        const nodesWithFork: StudioCanvasNode[] = [
            taskNode('inner', 'BRANCH', {
                branches: [
                    { branchName: 'Branch 1', startTaskId: 'transform' },
                    { branchName: 'Branch 2', startTaskId: 'wait3' },
                ],
            }),
            taskNode('wait3', 'WAIT', { duration: 1000 }),
        ];
        const staleOverlayNodes: StudioCanvasNode[] = [
            taskNode('inner', 'BRANCH', {
                branches: [
                    { branchName: 'Branch 1', startTaskId: 'transform' },
                    { branchName: 'Branch 2', startTaskId: '' },
                ],
            }),
            taskNode('wait3', 'WAIT', { duration: 1000 }),
        ];

        const hasForkEdge = (canvasNodes: StudioCanvasNode[]) =>
            mergeDisplayEdges([], canvasNodes).some(
                (edge) => edge.source === 'inner' && edge.target === 'wait3',
            );

        expect(hasForkEdge(nodesWithFork)).toBe(true);
        expect(hasForkEdge(staleOverlayNodes)).toBe(false);
    });
});
