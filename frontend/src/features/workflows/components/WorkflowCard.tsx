import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkflowDefinition } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/ui/hint';

interface WorkflowCardProps {
    workflow: WorkflowDefinition;
    onClick: () => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
    const navigate = useNavigate();

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div 
            onClick={onClick}
            className="flex cursor-pointer flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
        >
            <div>
                <h3 className="font-bold text-base leading-tight">{workflow.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {workflow.tasks.length} {workflow.tasks.length === 1 ? 'task' : 'tasks'} configured
                </p>
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                        Tasks: {workflow.tasks?.length ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        Updated: {formatDate(workflow.updatedAt ?? workflow.createdAt)}
                    </span>
                </div>
                
                <Hint content={`Open ${workflow.name}`}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'text-muted-foreground',
                            'hover:bg-muted hover:text-foreground',
                        )}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (workflow.id) {
                                navigate(`/workflows/${workflow.id}`);
                            }
                        }}
                        aria-label={`Open ${workflow.name}`}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Hint>
            </div>
        </div>
    );
}
