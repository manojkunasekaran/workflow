import { useMemo, useState } from 'react';
import {
    Code2,
    X,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    AlertCircle,
} from 'lucide-react';
import type { WorkflowExecution, WorkflowTaskExecution } from '@/api/executionApi';
import type { WorkflowDefinition } from '@/types/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExecutionStatusBadge } from '@/features/executions/ExecutionStatusBadge';
import { HumanTaskRespondForm } from '@/features/executions/HumanTaskRespondForm';
import { canRespondToHumanTask } from '@/features/executions/lib/humanTaskExecution';
import { formatExecutionDuration, formatExecutionTimestamp } from '@/features/executions/lib/executionDisplay';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import { resolveTaskDisplayName, taskTypeLabel } from '@/features/workflow-studio/lib/taskDisplayName';
import { TaskParametersForm } from '@/features/workflow-studio/task-config/TaskParametersForm';
import { TaskConfigContext } from '@/features/workflow-studio/task-config/TaskConfigContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { STUDIO_GHOST_ICON_BUTTON_CLASS } from '@/features/workflow-studio/constants/studioUi';

interface TaskExecutionDialogProps {
    open: boolean;
    taskId: string | null;
    definition: WorkflowDefinition;
    execution: WorkflowExecution;
    taskExecutions: WorkflowTaskExecution[];
    onOpenChange: (open: boolean) => void;
    onRefresh: () => void;
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                });
            }}
            className="ml-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition group-hover:opacity-100 hover:!opacity-100 hover:text-foreground"
            aria-label="Copy"
        >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
    );
}

// ─── Collapsible output section ───────────────────────────────────────────────
function OutputSection({ executionData }: { executionData: unknown }) {
    const [open, setOpen] = useState(true);
    const [copied, setCopied] = useState(false);

    if (executionData === undefined || executionData === null) return null;

    let text = '';
    try {
        text = JSON.stringify(executionData, null, 2);
    } catch {
        text = String(executionData);
    }

    return (
        <div>
            <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-left"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Output data
                </span>
                {open ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
            </button>
            {open && (
                <div className="relative mt-1">
                    <button
                        type="button"
                        onClick={() => {
                            void navigator.clipboard.writeText(text).then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            });
                        }}
                        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground"
                    >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <pre className="scrollbar-thin max-h-56 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
                        {text}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Subtitle — task type · duration (tooltip shows start → end) ─────────────
function TaskSubtitle({
    taskType,
    taskExecution,
}: {
    taskType: string;
    taskExecution: WorkflowTaskExecution | null;
}) {
    const typeLabel = taskTypeLabel(taskType);
    const duration = taskExecution?.startTime
        ? formatExecutionDuration(taskExecution.startTime, taskExecution.endTime)
        : null;

    const formatTs = formatExecutionTimestamp;

    const started = formatTs(taskExecution?.startTime);
    const ended = formatTs(taskExecution?.endTime ?? undefined);

    return (
        <p className="mt-0.5 text-xs text-muted-foreground">
            {typeLabel}
            {duration && started ? (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="ml-2 cursor-help font-medium text-foreground/70 underline decoration-dotted underline-offset-2">
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
            ) : duration ? (
                <span className="ml-2 font-medium text-foreground/70">{duration}</span>
            ) : null}
        </p>
    );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────
export function TaskExecutionDialog({
    open,
    taskId,
    definition,
    execution,
    taskExecutions,
    onOpenChange,
    onRefresh,
}: TaskExecutionDialogProps) {
    const task = useMemo(
        () => definition.tasks.find((item) => item.taskId === taskId) ?? null,
        [definition.tasks, taskId],
    );

    const taskExecution = useMemo(
        () => taskExecutions.find((item) => item.taskDefinitionId === taskId) ?? null,
        [taskExecutions, taskId],
    );

    const plugin = useMemo(() => (task ? getTaskTypePlugin(task.type) : undefined), [task]);

    const status = taskExecution?.status ?? 'PENDING';

    const showHumanRespond = canRespondToHumanTask(taskExecution);

    const displayName = task
        ? resolveTaskDisplayName({
              displayName: task.parameters?.displayName as string | undefined,
              type: task.type,
          })
        : 'Step';

    const Icon = plugin?.icon ?? Code2;
    const accentColor = plugin?.accentColor ?? '#64748b';

    // Minimal validation context — read-only, no wiring
    const readOnlyContext = useMemo(
        () => ({ workflowTasks: definition.tasks as any[], taskOrder: [] }),
        [definition.tasks],
    );

    return (
        <Dialog open={open && Boolean(task)} onOpenChange={onOpenChange} modal={false}>
            <DialogContent
                blocking={false}
                className="flex max-h-[90vh] w-full flex-col p-0 sm:max-w-lg"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
            >
                {task ? (
                    <TaskConfigContext.Provider value={readOnlyContext}>
                        {/* ── Header — identical structure to TaskConfigDialog ── */}
                        <div
                            className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"
                            style={{ borderTopColor: `${accentColor}55`, borderTopWidth: 3 }}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                    style={{
                                        backgroundColor: `${accentColor}18`,
                                        color: accentColor,
                                    }}
                                    aria-hidden
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <DialogTitle className="truncate text-lg font-bold leading-tight">
                                        {displayName}
                                    </DialogTitle>
                                    <TaskSubtitle taskType={task.type} taskExecution={taskExecution} />
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <ExecutionStatusBadge status={status} size="md" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn('h-8 w-8', STUDIO_GHOST_ICON_BUTTON_CLASS)}
                                    onClick={() => onOpenChange(false)}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* ── Body — same layout as TaskConfigDialog ── */}
                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
                            {/* Human task respond form */}
                            {showHumanRespond && taskExecution ? (
                                <HumanTaskRespondForm
                                    executionId={execution.id}
                                    task={task}
                                    taskExecution={taskExecution}
                                    onSuccess={() => {
                                        onRefresh();
                                        onOpenChange(false);
                                    }}
                                />
                            ) : null}

                            {/* Error banner */}
                            {taskExecution?.errorMessage ? (
                                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="break-all">{taskExecution.errorMessage}</span>
                                </div>
                            ) : null}

                            {/* Read-only config form — same rendering as TaskConfigDialog */}
                            {plugin ? (
                                <TaskParametersForm
                                    plugin={plugin}
                                    parameters={task.parameters as Record<string, unknown>}
                                    onChange={() => {/* read-only */}}
                                    readOnly
                                />
                            ) : null}

                            {/* Output data */}
                            {taskExecution?.executionData != null ? (
                                <OutputSection executionData={taskExecution.executionData} />
                            ) : null}
                        </div>

                        </TaskConfigContext.Provider>
                    ) : null}
            </DialogContent>
        </Dialog>
    );
}
