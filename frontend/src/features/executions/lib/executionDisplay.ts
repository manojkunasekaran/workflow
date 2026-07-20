export function formatExecutionDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime).getTime();
    if (Number.isNaN(start)) return '—';
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    if (Number.isNaN(end)) return '—';
    const ms = Math.max(0, end - start);
    if (ms === 0) return '< 1ms';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (minutes < 60) return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pending',
    RUNNING: 'Running',
    PAUSED: 'Paused',
    COMPLETED: 'Done',
    SUCCESS: 'Done',
    FAILED: 'Failed',
    BRANCHED: 'Branched',
    SKIPPED: 'Skipped',
    QUEUED: 'Queued',
};

export function executionStatusLabel(status: string): string {
    return STATUS_LABEL[status.toUpperCase()] ?? status;
}

export function executionStatusVariant(
    status: string,
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
    switch (status.toUpperCase()) {
        case 'COMPLETED':
        case 'SUCCESS':
            return 'success';
        case 'FAILED':
            return 'danger';
        case 'RUNNING':
        case 'QUEUED':
        case 'PAUSED':
            return 'warning';
        case 'BRANCHED':
            return 'info';
        default:
            return 'neutral';
    }
}

export function formatExecutionTimestamp(ts?: string): string | null {
    if (!ts) return null;
    return new Date(ts).toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    });
}
