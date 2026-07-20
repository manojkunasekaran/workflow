import { ArrowLeft, ExternalLink, History, MoreVertical, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    STUDIO_GHOST_ICON_BUTTON_CLASS,
    STUDIO_INPUT_FOCUS_CLASS,
    STUDIO_OUTLINE_BUTTON_CLASS,
} from '@/features/workflow-studio/constants/studioUi';

export type StudioMode = 'design' | 'inspect';

interface StudioHeaderProps {
    workflowName: string;
    onWorkflowNameChange: (name: string) => void;
    mode: StudioMode;
    onModeChange: (mode: StudioMode) => void;
    isDirty: boolean;
    isSaving: boolean;
    isRunning: boolean;
    lastExecutionId?: string | null;
    onSave: () => void;
    onRun: () => void;
    onBack: () => void;
}

export function StudioHeader({
    workflowName,
    onWorkflowNameChange,
    mode,
    onModeChange,
    isDirty,
    isSaving,
    isRunning,
    lastExecutionId,
    onSave,
    onRun,
    onBack,
}: StudioHeaderProps) {
    return (
        <PageHeader
            title={
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn('h-8 w-8 shrink-0', STUDIO_GHOST_ICON_BUTTON_CLASS)}
                        onClick={onBack}
                        aria-label="Back to workflows"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex min-w-0 items-center gap-2">
                        <input
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
                            <span className="shrink-0 rounded-md border border-border/70 bg-muted/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Draft
                            </span>
                        ) : null}
                    </div>
                </div>
            }
            actions={
                <>
                    <div className="flex items-center rounded-md border border-border bg-muted p-0.5">
                        <button
                            type="button"
                            onClick={() => onModeChange('design')}
                            className={cn(
                                'rounded-sm px-3 py-1 text-xs font-medium transition-colors',
                                mode === 'design'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Design
                        </button>
                        <button
                            type="button"
                            onClick={() => onModeChange('inspect')}
                            className={cn(
                                'rounded-sm px-3 py-1 text-xs font-medium transition-colors',
                                mode === 'inspect'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Inspect
                        </button>
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" onClick={onRun} disabled={isRunning || mode === 'inspect'}>
                        <Play className="h-4 w-4 fill-current" />
                        {isRunning ? 'Running…' : 'Run Workflow'}
                    </Button>
                    {lastExecutionId ? (
                        <Button variant="outline" size="sm" asChild className={STUDIO_OUTLINE_BUTTON_CLASS}>
                            <Link to={`/executions/${lastExecutionId}`}>
                                <ExternalLink className="h-4 w-4" />
                                View execution
                            </Link>
                        </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)} disabled>
                        <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)} disabled>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </>
            }
        />
    );
}
