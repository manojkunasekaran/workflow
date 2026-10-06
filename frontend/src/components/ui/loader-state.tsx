import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoaderState({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-16 text-muted-foreground", className)}>
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
}
