import type { Node } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import type { StartNodeData } from '@/features/workflow-studio/nodes/StartNode';

/** Non-rendered layout anchor for the trailing "+" position (kept in state only). */
export type AddTaskAnchorData = Record<string, never>;

export type StudioCanvasNode = Node<TaskNodeData | StartNodeData | AddTaskAnchorData>;

export function getTaskNodes(nodes: StudioCanvasNode[]): Node<TaskNodeData>[] {
    return nodes.filter((node): node is Node<TaskNodeData> => node.type === 'task');
}
