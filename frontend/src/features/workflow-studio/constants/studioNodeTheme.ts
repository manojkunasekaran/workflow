import type { StudioTaskType } from '@/features/workflow-studio/task-type-schema/pluginTypes';

/** Per-type icon tile colors (n8n-style, light canvas). */
import type { CSSProperties } from 'react';

export const TASK_ACCENT_COLORS: Record<StudioTaskType, string> = {
    HTTP_TASK: '#7c3aed',
    SCRIPT_TASK: '#ea580c',
    CONDITIONAL: '#9333ea',
    ITERATOR_TASK: '#0284c7',
    HUMAN_TASK: '#db2777',
    BRANCH: '#d97706',
    JOIN: '#059669',
    WAIT: '#2563eb',
    DATA_TRANSFORM: '#7c3aed',
    SMTP_TASK: '#0891b2',
    CONNECTOR_TASK: '#ec4899',
    AGENTS_TASK: '#8b5cf6',
    DB_TASK: '#475569',
    MONGO_TASK: '#16a34a',
    REDIS_TASK: '#dc2626',
    NEO4J_TASK: '#2563eb',
    MCP_TOOL: '#0d9488',
};

export const TRIGGER_ACCENT_COLOR = '#0d9488';
export const WEBHOOK_ACCENT_COLOR = '#c026d3';
export const SCHEDULE_ACCENT_COLOR = '#0284c7';
export const POLL_ACCENT_COLOR = '#ea580c';
export const DEFAULT_TASK_ACCENT_COLOR = '#6366f1';

export function resolveTaskAccentColor(type: string): string {
    return TASK_ACCENT_COLORS[type as StudioTaskType] ?? DEFAULT_TASK_ACCENT_COLOR;
}

export const STUDIO_NODE_DEFAULT_BORDER_CLASS = 'border-[#94a3b8]';

export type StudioNodeBorderState = {
    invalid?: boolean;
    selected?: boolean;
    statusBorderClass?: string;
    accentColor?: string;
};

export function resolveStudioNodeBorder(state: StudioNodeBorderState): {
    className: string;
    style?: CSSProperties;
} {
    if (state.invalid) {
        return { className: 'border-destructive' };
    }
    if (state.statusBorderClass) {
        return { className: state.statusBorderClass };
    }
    if (state.selected && state.accentColor) {
        return { className: '', style: { borderColor: state.accentColor } };
    }
    return { className: STUDIO_NODE_DEFAULT_BORDER_CLASS };
}
