import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { TaskFieldSchema, TaskParameterErrors, TaskValidationContext } from './types';
import type { TaskPluginWiring } from './pluginWiringTypes';
import type {
    ExecutionSummaryContext,
    ExecutionSummaryResult,
} from '@/features/executions/lib/executionSummaryUtils';

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
    'SMTP_TASK',
    'CONNECTOR_TASK',
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
    /** Read-only execution observability summary for the step panel. */
    executionSummary?: (context: ExecutionSummaryContext) => ExecutionSummaryResult | null;
    /** Optional test panel button rendered in the header. */
    testComponent?: React.FC<{ parameters: Record<string, unknown> }>;
    /** Canvas handle + route-edge wiring (n8n-style). Omit for default main-flow only. */
    wiring?: TaskPluginWiring;
}

export function defineTaskPlugin(plugin: TaskTypePlugin): TaskTypePlugin {
    return plugin;
}
