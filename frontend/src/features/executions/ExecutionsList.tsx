import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { executionApi, type WorkflowExecution } from '@/api/executionApi';
import { workflowApi } from '@/api/workflowApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import {
    formatExecutionDuration,
    formatExecutionTimestamp,
} from '@/features/executions/lib/executionDisplay';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';

function findFailedStepId(execution: WorkflowExecution): string | null {
    const failed = execution.taskExecutionSummaries?.find(
        (summary) => summary.status.toUpperCase() === 'FAILED',
    );
    return failed?.taskDefinitionId ?? null;
}

export default function ExecutionsList() {
    const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
    const [workflowNames, setWorkflowNames] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const loadExecutions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [executionData, workflows] = await Promise.all([
                executionApi.getAll(),
                workflowApi.getAll(),
            ]);
            setExecutions(executionData);
            setWorkflowNames(
                Object.fromEntries(
                    workflows
                        .filter((workflow) => workflow.id)
                        .map((workflow) => [workflow.id as string, workflow.name]),
                ),
            );
        } catch (err) {
            console.error('Failed to load executions', err);
            setError('Failed to load executions');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadExecutions();
    }, [loadExecutions]);

    const sortedExecutions = useMemo(
        () =>
            [...executions].sort(
                (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
            ),
        [executions],
    );

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader title={<h1 className="text-sm font-semibold">Executions</h1>} />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 data-testid="executions-list-heading" className="text-sm font-semibold">Executions</h1>}
                actions={
                    <Button data-testid="refresh-executions-btn" variant="outline" size="sm" onClick={() => void loadExecutions()}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {error ? (
                    <div data-testid="executions-error-banner" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                ) : null}

                {sortedExecutions.length === 0 && !error ? (
                    <div data-testid="executions-empty-state" className="py-12 text-center text-muted-foreground">
                        No executions found. Run a workflow to see executions here.
                    </div>
                ) : sortedExecutions.length > 0 ? (
                    <div data-testid="executions-table-container" className="overflow-hidden rounded-lg border border-border bg-card">
                        <table className="w-full">
                            <thead className="border-b border-border bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Workflow
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Duration
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Started
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Failed step
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedExecutions.map((execution) => {
                                    const failedStepId = findFailedStepId(execution);
                                    const workflowName =
                                        workflowNames[execution.workflowId] ?? execution.workflowId;
                                    const duration = formatExecutionDuration(
                                        execution.startTime,
                                        execution.endTime,
                                    );

                                    return (
                                        <tr
                                            key={execution.id}
                                            data-testid={`execution-row-${execution.id}`}
                                            className="cursor-pointer transition-colors hover:bg-muted/30"
                                            onClick={() => navigate(`/executions/${execution.id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div data-testid={`execution-workflow-name-${execution.id}`} className="text-sm font-medium text-foreground">
                                                    {workflowName}
                                                </div>
                                            </td>
                                            <td data-testid={`execution-status-cell-${execution.id}`} className="px-4 py-3">
                                                <ExecutionStatusBadge status={execution.status} size="lg" />
                                            </td>
                                            <td data-testid={`execution-duration-${execution.id}`} className="px-4 py-3 text-sm text-muted-foreground">
                                                {duration}
                                            </td>
                                            <td data-testid={`execution-timestamp-${execution.id}`} className="px-4 py-3 text-sm text-muted-foreground">
                                                {formatExecutionTimestamp(execution.startTime)}
                                            </td>
                                            <td data-testid={`execution-failed-step-${execution.id}`} className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                {failedStepId ? (
                                                    <span className="text-destructive">
                                                        {failedStepId}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Hint content="View execution details">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            asChild
                                                            className={cn(
                                                                'text-muted-foreground',
                                                                'hover:bg-muted hover:text-foreground',
                                                            )}
                                                        >
                                                            <Link
                                                                data-testid={`open-execution-link-${execution.id}`}
                                                                to={`/executions/${execution.id}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </Hint>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
