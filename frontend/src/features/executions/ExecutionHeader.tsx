import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { formatExecutionDuration, formatExecutionTimestamp } from '@/features/executions/lib/executionDisplay';
import type { WorkflowExecution } from '@/api/executionApi';
import type { WorkflowDefinition } from '@/types/api';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
    const isRunning = ['RUNNING', 'QUEUED'].includes(execution.status.toUpperCase());

    const formatTs = formatExecutionTimestamp;

    const started = formatTs(execution.startTime);
    const ended = formatTs(execution.endTime);

    return (
        <PageHeader
            title={
                <div className="flex items-center gap-2">
                    {!embedded && onBack && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={onBack}
                            aria-label="Back"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-sm font-semibold">
                                {embedded ? 'Execution inspect' : 'Execution'}
                            </h1>
                            <ExecutionStatusBadge status={execution.status} size="md" />

                            {/* Duration with start/end tooltip */}
                            {isRunning ? (
                                <span className="text-xs text-muted-foreground">Running…</span>
                            ) : (
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help text-xs text-muted-foreground underline decoration-dotted underline-offset-2">
                                                {duration}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-left">
                                            <div className="space-y-0.5">
                                                {started && (
                                                    <p><span className="opacity-60">Started </span>{started}</p>
                                                )}
                                                {ended && (
                                                    <p><span className="opacity-60">Ended </span>{ended}</p>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                </div>
            }
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                    </Button>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" asChild>
                                    <Link to={`/workflows/${execution.workflowId}`}>
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="max-w-[140px] truncate">{definition.name}</span>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Open workflow</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            }
        />
    );
}
