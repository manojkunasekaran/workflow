export interface InsightsRunMetrics {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    inProgressRuns: number;
    lastRunAt?: string | null;
}

export function terminalRunCount(metrics: InsightsRunMetrics): number {
    return metrics.completedRuns + metrics.failedRuns;
}

export function successRatePercent(completed: number, failed: number): number | null {
    const terminal = completed + failed;
    if (terminal === 0) return null;
    return Math.round((completed / terminal) * 100);
}

export function statusSegmentPercents(metrics: InsightsRunMetrics): {
    completed: number;
    failed: number;
    inProgress: number;
} {
    const total = metrics.totalRuns;
    if (total <= 0) {
        return { completed: 0, failed: 0, inProgress: 0 };
    }
    return {
        completed: (metrics.completedRuns / total) * 100,
        failed: (metrics.failedRuns / total) * 100,
        inProgress: (metrics.inProgressRuns / total) * 100,
    };
}
