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
