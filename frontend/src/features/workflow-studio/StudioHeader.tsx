import { ArrowLeft, BarChart3, ExternalLink, History, MoreVertical, Play, Puzzle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    STUDIO_GHOST_ICON_BUTTON_CLASS,
    STUDIO_INPUT_FOCUS_CLASS,
    STUDIO_OUTLINE_BUTTON_CLASS,
} from '@/features/workflow-studio/constants/studioUi';

interface StudioHeaderProps {
    workflowName: string;
    onWorkflowNameChange: (name: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    isRunning: boolean;
    lastExecutionId?: string | null;
    onSave: () => void;
    onRun: () => void;
    onBack: () => void;
    onAssignIntegration: () => void;
    onViewUseCaseInsights?: () => void;
    hasIntegration?: boolean;
}

export function StudioHeader({
    workflowName,
    onWorkflowNameChange,
    isDirty,
    isSaving,
    isRunning,
    lastExecutionId,
    onSave,
    onRun,
    onBack,
    onAssignIntegration,
    onViewUseCaseInsights,
    hasIntegration,
}: StudioHeaderProps) {

    return (
        <PageHeader
            title={
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-testid="back-to-workflows-btn"
                        className={cn('h-8 w-8 shrink-0', STUDIO_GHOST_ICON_BUTTON_CLASS)}
                        onClick={onBack}
                        aria-label="Back to workflows"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex min-w-0 items-center gap-2">
                        <input
                            data-testid="workflow-name-input"
                            value={workflowName}
                            onChange={(e) => onWorkflowNameChange(e.target.value)}
                            placeholder="Workflow name"
                            size={Math.min(Math.max(workflowName.length || 15, 12), 40)}
                            className={cn(
                                'w-auto min-w-[10ch] max-w-[22rem] rounded-md border border-transparent bg-transparent px-2.5 py-1.5',
                                'text-sm font-semibold text-foreground outline-none transition-colors [field-sizing:content]',
                                'placeholder:font-normal placeholder:text-muted-foreground',
                                'hover:border-border hover:bg-muted/45',
                                STUDIO_INPUT_FOCUS_CLASS,
                            )}
                            aria-label="Workflow name"
                        />
                        {isDirty ? (
                            <span data-testid="unsaved-badge" className="shrink-0 rounded-md border border-border/70 bg-muted/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Unsaved
                            </span>
                        ) : null}
                    </div>
                </div>
            }
            actions={
                <>
                    <Button
                        data-testid="save-workflow-btn"
                        variant="secondary"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button data-testid="run-workflow-btn" size="sm" onClick={onRun} disabled={isRunning}>
                        <Play className="h-4 w-4 fill-current" />
                        {isRunning ? 'Running...' : 'Run Workflow'}
                    </Button>
                    {lastExecutionId ? (
                        <Button data-testid="view-execution-link" variant="outline" size="sm" asChild className={STUDIO_OUTLINE_BUTTON_CLASS}>
                            <Link to={`/executions/${lastExecutionId}`}>
                                <ExternalLink className="h-4 w-4" />
                                View execution
                            </Link>
                        </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)} disabled>
                        <History className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {hasIntegration && onViewUseCaseInsights ? (
                                <DropdownMenuItem
                                    data-testid="view-use-case-insights-menu-item"
                                    onClick={onViewUseCaseInsights}
                                >
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    <span>View use case insights</span>
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={onAssignIntegration}>
                                <Puzzle className="mr-2 h-4 w-4" />
                                <span>{hasIntegration ? 'Edit Integration Assignment' : 'Assign to Integration'}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            }
        />
    );
}
