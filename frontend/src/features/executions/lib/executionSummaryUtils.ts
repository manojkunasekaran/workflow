export interface ExecutionSummaryContext {
    parameters: Record<string, unknown>;
    executionData?: unknown;
    errorMessage?: string;
    status: string;
}

export interface ExecutionSummaryLine {
    label: string;
    value: string;
    tone?: 'default' | 'success' | 'warning' | 'danger';
}

export interface ExecutionSummaryResult {
    lines: ExecutionSummaryLine[];
}

export function recordFromUnknown(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

export function readNested(
    record: Record<string, unknown> | null,
    ...path: string[]
): unknown {
    if (!record) return undefined;
    let current: unknown = record;
    for (const key of path) {
        const next = recordFromUnknown(current);
        if (!next) return undefined;
        current = next[key];
    }
    return current;
}

export function formatPrimitive(value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'object') {
        try {
            const text = JSON.stringify(value);
            return text.length > 120 ? `${text.slice(0, 117)}…` : text;
        } catch {
            return String(value);
        }
    }
    return String(value);
}

/** Convert raw milliseconds to a human-readable duration like "1.3s", "2m 5s". */
export function formatDurationMs(value: unknown): string {
    const ms = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(ms) || ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
    const minutes = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    if (minutes < 60) return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

export function getFailedStepId(taskExecutions: { status: string; taskDefinitionId: string }[] | undefined): string | null {
    if (!taskExecutions || taskExecutions.length === 0) return null;
    const failedTask = taskExecutions.find(t => t.status.toUpperCase() === 'FAILED');
    return failedTask ? failedTask.taskDefinitionId : null;
}
