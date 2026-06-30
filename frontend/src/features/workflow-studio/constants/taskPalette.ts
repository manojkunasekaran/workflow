import { listTaskPlugins } from '@/features/workflow-studio/task-type-schema/registry';
import { buildDefaultParameters } from '@/features/workflow-studio/task-type-schema/utils';
import type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';

export type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';

export interface TaskPaletteItem {
    type: StudioTaskType;
    label: string;
    icon: import('lucide-react').LucideIcon;
    defaultTaskId: string;
    defaultParameters: Record<string, unknown>;
}

export const TASK_PALETTE: TaskPaletteItem[] = listTaskPlugins().map((plugin) => ({
    type: plugin.type,
    label: plugin.label,
    icon: plugin.icon,
    defaultTaskId: plugin.defaultTaskId,
    defaultParameters: {
        type: plugin.type,
        ...buildDefaultParameters(plugin),
    },
}));

export const TASK_TYPE_LABELS: Record<StudioTaskType, string> = Object.fromEntries(
    TASK_PALETTE.map((item) => [item.type, item.label]),
) as Record<StudioTaskType, string>;

export const EMPTY_WORKFLOW = {
    name: 'Untitled Workflow',
    tasks: [],
};
