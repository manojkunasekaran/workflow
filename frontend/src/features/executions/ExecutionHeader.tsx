import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { formatExecutionDuration } from '@/features/executions/lib/executionDisplay';
import type { WorkflowExecution } from '@/api/executionApi';
import type { WorkflowDefinition } from '@/types/api';
import { cn } from '@/lib/utils';

interface ExecutionHeaderProps {
    execution: WorkflowExecution;
    definition: WorkflowDefinition;
    onRefresh: () => void;
    isRefreshing?: boolean;
    onBack?: () => void;
    embedded?: boolean;
}

export function ExecutionHeader({
    execution,
    definition,
    onRefresh,
    isRefreshing = false,
    onBack,
    embedded = false,
}: ExecutionHeaderProps) {
    const duration = formatExecutionDuration(execution.startTime, execution.endTime);
    const isRunning = !execution.endTime && ['RUNNING', 'QUEUED', 'PAUSED'].includes(execution.status);

    return (
        <PageHeader
            title={
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-sm font-semibold">
                            {embedded ? 'Execution inspect' : 'Execution'}
                        </h1>
                        <ExecutionStatusBadge status={execution.status} size="md" />
                        <span className="text-xs text-muted-foreground">
                            {isRunning ? 'Running…' : duration}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <Link
                            to={`/workflows/${execution.workflowId}`}
                            className="truncate font-medium text-foreground/80 hover:underline"
                        >
                            {definition.name}
                        </Link>
                        <span>Started {new Date(execution.startTime).toLocaleString()}</span>
                        {execution.endTime ? (
                            <span>Ended {new Date(execution.endTime).toLocaleString()}</span>
                        ) : null}
                    </div>
                </div>
            }
            actions={
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                    </Button>
                    {!embedded && onBack ? (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    ) : null}
                </>
            }
        />
    );
}
