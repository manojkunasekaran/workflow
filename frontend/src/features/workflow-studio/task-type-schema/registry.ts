import { TASK_PLUGINS } from './plugins';
import type { StudioTaskType, TaskTypePlugin } from './pluginTypes';

let activePlugins: TaskTypePlugin[] | null = null;
let pluginMap: Map<StudioTaskType, TaskTypePlugin> | null = null;

function ensureRegistry(): void {
    if (pluginMap) return;
    activePlugins = TASK_PLUGINS;
    pluginMap = new Map(activePlugins.map((plugin) => [plugin.type, plugin]));
}

export function getTaskTypePlugin(type: string): TaskTypePlugin | undefined {
    ensureRegistry();
    return pluginMap!.get(type as StudioTaskType);
}

export function listTaskPlugins(): TaskTypePlugin[] {
    ensureRegistry();
    return activePlugins!;
}
