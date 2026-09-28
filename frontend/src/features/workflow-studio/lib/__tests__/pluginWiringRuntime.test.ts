import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { JOIN_MERGE_IN, MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import {
    applyGraphConnection,
    applyRouteEdgeRemoval,
    buildJoinConvergeEdges,
    mergeDisplayEdges,
} from '@/features/workflow-studio/lib/pluginWiringRuntime';
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

describe('pluginWiringRuntime — JOIN wiring', () => {
    it('buildJoinConvergeEdges derives edges from JOIN.inboundTaskIds only', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('left', 'HTTP_TASK', {}),
            taskNode('right', 'HTTP_TASK', {}),
            taskNode('join1', 'JOIN', { inboundTaskIds: ['left', 'right'], nextTaskId: '' }),
        ];

        const edges = buildJoinConvergeEdges(nodes);
        expect(edges).toHaveLength(2);
        expect(edges.map((edge) => `${edge.source}->${edge.target}`).sort()).toEqual([
            'left->join1',
            'right->join1',
        ]);
        expect(edges.every((edge) => edge.sourceHandle === MAIN_OUT && edge.targetHandle === JOIN_MERGE_IN)).toBe(
            true,
        );
    });

    it('mergeDisplayEdges includes converge edges without local tip math', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('a', 'HTTP_TASK', {}),
            taskNode('join1', 'JOIN', { inboundTaskIds: ['a'], nextTaskId: '' }),
        ];
        const chainEdges: Edge[] = [];

        const merged = mergeDisplayEdges(chainEdges, nodes);
        expect(merged.some((edge) => edge.source === 'a' && edge.target === 'join1')).toBe(true);
    });

    it('applyGraphConnection wires any main-out task into JOIN.inboundTaskIds', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('standalone', 'HTTP_TASK', {}),
            taskNode('join1', 'JOIN', { inboundTaskIds: [], nextTaskId: '' }),
        ];

        const next = applyGraphConnection(
            {
                source: 'standalone',
                target: 'join1',
                sourceHandle: MAIN_OUT,
                targetHandle: JOIN_MERGE_IN,
            },
            nodes,
            [],
        );

        expect(next).not.toBeNull();
        const joinNode = next!.find((node) => node.id === 'join1');
        expect((joinNode?.data as TaskNodeData).parameters.inboundTaskIds).toEqual(['standalone']);
    });

    it('applyRouteEdgeRemoval removes inbound from JOIN.inboundTaskIds', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('left', 'HTTP_TASK', {}),
            taskNode('join1', 'JOIN', { inboundTaskIds: ['left'], nextTaskId: '' }),
        ];
        const edge: Edge = {
            id: 'route:left:main-out->join1',
            source: 'left',
            sourceHandle: MAIN_OUT,
            target: 'join1',
            targetHandle: JOIN_MERGE_IN,
            type: 'route',
        };

        const next = applyRouteEdgeRemoval(edge, nodes, []);
        const joinNode = next?.find((node) => node.id === 'join1');
        expect((joinNode?.data as TaskNodeData).parameters.inboundTaskIds).toEqual([]);
    });
});
