import type { LucideIcon } from 'lucide-react';
import type { TaskFieldSchema, TaskParameterErrors, TaskValidationContext } from './types';
import type { TaskPluginWiring } from './pluginWiringTypes';

export const STUDIO_TASK_TYPES = [
    'HTTP_TASK',
    'SCRIPT_TASK',
    'CONDITIONAL',
    'ITERATOR_TASK',
    'HUMAN_TASK',
    'BRANCH',
    'JOIN',
    'WAIT',
    'DATA_TRANSFORM',
] as const;

export type StudioTaskType = (typeof STUDIO_TASK_TYPES)[number];

export interface TaskPreview {
    primary?: string;
    secondary?: string;
    method?: string;
}

export interface TaskTypePlugin {
    type: StudioTaskType;
    label: string;
    icon: LucideIcon;
    /** Icon tile background on the canvas (n8n-style). */
    accentColor: string;
    defaultTaskId: string;
    fields: TaskFieldSchema[];
    /** Type-specific validation — mutate `errors` in place. */
    validate?: (
        parameters: Record<string, unknown>,
        context: TaskValidationContext | undefined,
        errors: TaskParameterErrors,
    ) => void;
    /** Type-specific normalization after generic field normalization. */
    normalize?: (parameters: Record<string, unknown>) => Record<string, unknown>;
    preview?: (parameters: Record<string, unknown>) => TaskPreview;
    /** Canvas handle + route-edge wiring (n8n-style). Omit for default main-flow only. */
    wiring?: TaskPluginWiring;
}

export function defineTaskPlugin(plugin: TaskTypePlugin): TaskTypePlugin {
    return plugin;
}
