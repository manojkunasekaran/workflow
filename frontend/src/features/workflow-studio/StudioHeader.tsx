import { ArrowLeft, History, MoreVertical, Play, Save } from 'lucide-react';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StudioMode = 'design' | 'inspect';

interface StudioHeaderProps {
    workflowName: string;
    onWorkflowNameChange: (name: string) => void;
    mode: StudioMode;
    onModeChange: (mode: StudioMode) => void;
    isDirty: boolean;
    isSaving: boolean;
    isRunning: boolean;
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
                        className="h-8 w-8 shrink-0"
                        onClick={onBack}
                        aria-label="Back to workflows"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <input
                        value={workflowName}
                        onChange={(e) => onWorkflowNameChange(e.target.value)}
                        className="min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-foreground outline-none focus:ring-0"
                        aria-label="Workflow name"
                    />
                    <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {isDirty ? 'Draft' : 'Saved'}
                    </span>
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
                        variant="outline"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" onClick={onRun} disabled={isRunning || mode === 'inspect'}>
                        <Play className="h-4 w-4 fill-current" />
                        {isRunning ? 'Running…' : 'Run Workflow'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </>
            }
        />
    );
}
