import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { TASK_TYPE_LABELS, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { getTaskNodes } from '@/features/workflow-studio/lib/canvasNodeUtils';

export function taskTypeLabel(type: string): string {
    return TASK_TYPE_LABELS[type as StudioTaskType] ?? type.replace(/_TASK$/, '').replace(/_/g, ' ');
}

export function resolveTaskDisplayName(data: Pick<TaskNodeData, 'displayName' | 'type'>): string {
    const custom = String(data.displayName ?? '').trim();
    if (custom) return custom;
    return taskTypeLabel(data.type);
}

export function nextCustomDisplayName(nodes: StudioCanvasNode[], base: string): string {
    const existing = new Set(
        getTaskNodes(nodes).map((node) => resolveTaskDisplayName(node.data as TaskNodeData).toLowerCase()),
    );
    if (!existing.has(base.toLowerCase())) return base;
    let index = 2;
    while (existing.has(`${base} ${index}`.toLowerCase())) index += 1;
    return `${base} ${index}`;
}

export function nextTaskDisplayName(nodes: StudioCanvasNode[], type: string): string {
    return nextCustomDisplayName(nodes, taskTypeLabel(type));
}
