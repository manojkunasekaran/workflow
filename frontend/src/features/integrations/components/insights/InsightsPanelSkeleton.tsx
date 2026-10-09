import { Skeleton } from '@/components/ui/skeleton';

export function InsightsPanelSkeleton() {
    return (
        <div className="space-y-4" data-testid="integration-insights-loading">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[108px] rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-40 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
    );
}
