import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title?: string;
    description: string;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-lg bg-muted/20", className)}>
            <Icon className="h-12 w-12 mb-4 opacity-20" />
            {title && <h3 className="font-medium text-foreground mb-1">{title}</h3>}
            <p className="text-sm">{description}</p>
        </div>
    );
}
