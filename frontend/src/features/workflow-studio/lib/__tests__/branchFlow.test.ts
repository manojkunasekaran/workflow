import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import { repositionLinkedJoinNodes } from '@/features/workflow-studio/lib/branchFlow';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';

function taskNode(
    id: string,
    type: string,
    parameters: Record<string, unknown>,
    position: { x: number; y: number },
): StudioCanvasNode {
    return {
        id,
        type: 'task',
        position,
        data: {
            taskId: id,
            type,
            displayName: id,
            parameters,
        } as TaskNodeData,
        draggable: true,
    };
}

describe('repositionLinkedJoinNodes', () => {
    it('positions detached JOIN from topology inbounds', () => {
        const nodes: StudioCanvasNode[] = [
            taskNode('task_a', 'HTTP_TASK', {}, { x: 100, y: 100 }),
            taskNode('task_b', 'HTTP_TASK', {}, { x: 100, y: 300 }),
            taskNode('join_detached', 'JOIN', {
                inboundTaskIds: ['task_a', 'task_b'],
                waitPolicy: 'ANY',
                nextTaskId: 'task_after',
            }, { x: 0, y: 0 }),
            taskNode('task_after', 'HTTP_TASK', {}, { x: 0, y: 0 }),
        ];
        const edges: Edge[] = [];

        const result = repositionLinkedJoinNodes(nodes, edges);
        const join = result.find((node) => node.id === 'join_detached');
        const after = result.find((node) => node.id === 'task_after');

        expect(join?.position.x).toBeGreaterThan(100);
        expect(join?.position.y).toBeGreaterThan(90);
        expect(join?.position.y).toBeLessThan(310);
        expect(after?.position.x).toBeGreaterThan(join?.position.x ?? 0);
    });
});
