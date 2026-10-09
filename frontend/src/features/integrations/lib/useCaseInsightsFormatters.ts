import type { UseCaseInsights as UseCaseInsightsSummary } from '@/types/api';

export function formatInsightTimestamp(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function formatInsightSuccessRate(completed: number, failed: number): string {
    const terminal = completed + failed;
    if (terminal === 0) return '—';
    return `${Math.round((completed / terminal) * 100)}%`;
}

export function useCaseDisplayLabel(input: {
    useCaseTitle?: string | null;
    workflowName?: string | null;
    workflowDefinitionId: string;
}): string {
    if (input.useCaseTitle?.trim()) return input.useCaseTitle.trim();
    if (input.workflowName?.trim()) return input.workflowName.trim();
    return input.workflowDefinitionId;
}

export function useCaseRowLabel(row: UseCaseInsightsSummary): string {
    return useCaseDisplayLabel(row);
}
