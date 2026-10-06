import type { UseCase } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Trash2, Puzzle, Workflow, Eye } from 'lucide-react';

interface UseCaseCardProps {
    useCase: UseCase;
    onView: (useCase: UseCase) => void;
    onRemove?: (useCase: UseCase) => void;
}

export function UseCaseCard({ useCase, onView, onRemove }: UseCaseCardProps) {
    return (
        <div 
            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary/30 transition-colors group cursor-pointer"
            onClick={() => onView(useCase)}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted/50">
                    <Puzzle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col truncate">
                    <span className="text-sm font-medium truncate">{useCase.useCaseTitle || useCase.name}</span>
                    {useCase.useCaseDescription && (
                        <span className="text-xs text-muted-foreground truncate">{useCase.useCaseDescription}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-background group/btn" 
                    onClick={(e) => { e.stopPropagation(); onView(useCase); }}
                >
                    <Workflow className="h-3.5 w-3.5 mr-1.5 group-hover/btn:hidden" />
                    <Eye className="h-3.5 w-3.5 mr-1.5 hidden group-hover/btn:block" />
                    View Workflow
                </Button>
                {onRemove && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                        onClick={(e) => { e.stopPropagation(); onRemove(useCase); }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}
