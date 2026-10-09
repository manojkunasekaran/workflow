import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ViewUseCaseInsightsButtonProps {
    workflowDefinitionId: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
}

export function ViewUseCaseInsightsButton({
    workflowDefinitionId,
    onClick,
    className,
}: ViewUseCaseInsightsButtonProps) {
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-7 text-xs bg-background shrink-0', className)}
            data-testid={`view-use-case-insights-${workflowDefinitionId}`}
            onClick={onClick}
        >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            View insights
        </Button>
    );
}
